import { useEffect, useMemo, useRef, useState } from 'react';

/** Duration in ms of the sliding note-accumulation window. */
const WINDOW_MS = 2000;

/** Duration of the longer window used only for major/minor discrimination. */
const LONG_WINDOW_MS = 6000;

/** Minimum unique pitch classes to enter passage mode (diatonic overlap). */
const MIN_DIATONIC_PCS = 5;

/** Minimum diatonic overlap score required in passage mode. */
const MIN_DIATONIC_SCORE = 4;

/**
 * Root pitch-class for each circle-of-fifths index (0 = C, 1 = C#, …).
 * Major order: C G D A E B F# C# G# D# A# F
 */
const MAJOR_ROOTS = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];

/**
 * Root pitch-class for each circle-of-fifths minor index.
 * Minor order: a e b f# c# g# d# a# f c g d
 */
const MINOR_ROOTS = [9, 4, 11, 6, 1, 8, 3, 10, 5, 0, 7, 2];

// ── Tonic triads (chord mode: 3–4 unique pitch classes) ──────────────────────
//   major: {root, root+4, root+7}   minor: {root, root+3, root+7}
const MAJOR_TONIC_SETS = MAJOR_ROOTS.map(r => new Set([r, (r + 4) % 12, (r + 7) % 12]));
const MINOR_TONIC_SETS = MINOR_ROOTS.map(r => new Set([r, (r + 3) % 12, (r + 7) % 12]));

// ── Diatonic scales (passage mode: 5+ unique pitch classes) ──────────────────
const MAJOR_SCALE_SETS = [
    [0, 2, 4, 5, 7, 9, 11],  // C  major
    [7, 9, 11, 0, 2, 4, 6],  // G  major
    [2, 4, 6, 7, 9, 11, 1],  // D  major
    [9, 11, 1, 2, 4, 6, 8],  // A  major
    [4, 6, 8, 9, 11, 1, 3],  // E  major
    [11, 1, 3, 4, 6, 8, 10], // B  major
    [6, 8, 10, 11, 1, 3, 5], // F# major
    [1, 3, 5, 6, 8, 10, 0],  // C# major
    [8, 10, 0, 1, 3, 5, 7],  // G# major
    [3, 5, 7, 8, 10, 0, 2],  // D# major
    [10, 0, 2, 3, 5, 7, 9],  // A# major
    [5, 7, 9, 10, 0, 2, 4],  // F  major
].map(pcs => new Set(pcs));

const MINOR_SCALE_SETS = [
    [9, 11, 0, 2, 4, 5, 7],  // a  minor
    [4, 6, 7, 9, 11, 0, 2],  // e  minor
    [11, 1, 2, 4, 6, 7, 9],  // b  minor
    [6, 8, 9, 11, 1, 2, 4],  // f# minor
    [1, 3, 4, 6, 8, 9, 11],  // c# minor
    [8, 10, 11, 1, 3, 4, 6], // g# minor
    [3, 5, 6, 8, 10, 11, 1], // d# minor
    [10, 0, 1, 3, 5, 6, 8],  // a# minor
    [5, 7, 8, 10, 0, 1, 3],  // f  minor
    [0, 2, 3, 5, 7, 8, 10],  // c  minor
    [7, 9, 10, 0, 2, 3, 5],  // g  minor
    [2, 4, 5, 7, 9, 10, 0],  // d  minor
].map(pcs => new Set(pcs));

// ── Types ────────────────────────────────────────────────────────────────────

export interface KeyDetectionResult {
    /** Circle-of-fifths indices of detected major keys (empty = none). */
    selectedMajorKeys: number[];
    /** Circle-of-fifths indices of detected minor keys (empty = none). */
    selectedMinorKeys: number[];
}

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Accepts the instantaneous set of pressed MIDI notes and derives the current
 * key(s) using a sliding 2-second accumulation window.
 *
 * The hook owns all window logic — App only needs to pass its live pressedNotes.
 *
 * Mode A — Chord (3–4 unique pitch classes in the window):
 *   Tonic-triad matching. Root must be present and ALL pitch classes must fit
 *   the tonic triad. Uniquely identifies C-E-G → C major.
 *
 * Mode B — Passage (5+ unique pitch classes in the window):
 *   Diatonic scale overlap. Returns key(s) with the highest overlap score,
 *   provided it reaches MIN_DIATONIC_SCORE. Works during real-piece playback.
 */
export function useKeyDetection(pressedNotes: Set<number>): KeyDetectionResult {
    const windowRef = useRef<Array<{ note: number; time: number }>>([]);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const longWindowRef = useRef<Array<{ note: number; time: number }>>([]);
    const longTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const prevNotesRef = useRef<Set<number>>(new Set());
    const [windowNotes, setWindowNotes] = useState<Set<number>>(new Set());
    const [longPcFreq, setLongPcFreq] = useState<Map<number, number>>(new Map());

    useEffect(() => {
        const prev = prevNotesRef.current;
        const now = Date.now();
        let newNoteOn = false;

        // Detect new note-on events (notes added since last render).
        for (const note of pressedNotes) {
            if (!prev.has(note)) {
                const ev = { note, time: now };
                windowRef.current.push(ev);
                longWindowRef.current.push(ev);
                newNoteOn = true;
            }
        }

        if (newNoteOn) {
            // Prune events outside the window.
            windowRef.current = windowRef.current.filter(e => now - e.time < WINDOW_MS);
            setWindowNotes(new Set(windowRef.current.map(e => e.note)));
            // Restart expiry timer: clear 2 s after the last note-on.
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
                windowRef.current = [];
                setWindowNotes(new Set());
            }, WINDOW_MS);

            // Long window: accumulate pitch-class frequencies for major/minor discrimination.
            longWindowRef.current = longWindowRef.current.filter(e => now - e.time < LONG_WINDOW_MS);
            const freqMap = new Map<number, number>();
            for (const e of longWindowRef.current) {
                const pc = e.note % 12;
                freqMap.set(pc, (freqMap.get(pc) ?? 0) + 1);
            }
            setLongPcFreq(freqMap);
            if (longTimerRef.current) clearTimeout(longTimerRef.current);
            longTimerRef.current = setTimeout(() => {
                longWindowRef.current = [];
                setLongPcFreq(new Map());
            }, LONG_WINDOW_MS);
        }

        prevNotesRef.current = new Set(pressedNotes);
    }, [pressedNotes]);

    return useMemo(
        () => discriminateMajorMinor(computeKeyDetection(windowNotes), longPcFreq),
        [windowNotes, longPcFreq],
    );
}

// ── Core detection (pure, no React) ──────────────────────────────────────────

function computeKeyDetection(windowNotes: Set<number>): KeyDetectionResult {
    if (windowNotes.size === 0) {
        return { selectedMajorKeys: [], selectedMinorKeys: [] };
    }

    // Reduce to unique pitch-classes.
    const pcs = new Set<number>();
    for (const note of windowNotes) pcs.add(note % 12);

    const selectedMajorKeys: number[] = [];
    const selectedMinorKeys: number[] = [];

    if (pcs.size >= MIN_DIATONIC_PCS) {
        // ── Passage mode: diatonic overlap ───────────────────────────────────
        const majorScores = MAJOR_SCALE_SETS.map(scale => { let n = 0; for (const pc of pcs) if (scale.has(pc)) n++; return n; });
        const minorScores = MINOR_SCALE_SETS.map(scale => { let n = 0; for (const pc of pcs) if (scale.has(pc)) n++; return n; });
        const maxMajor = Math.max(...majorScores);
        const maxMinor = Math.max(...minorScores);
        if (maxMajor >= MIN_DIATONIC_SCORE) majorScores.forEach((s, i) => { if (s === maxMajor) selectedMajorKeys.push(i); });
        if (maxMinor >= MIN_DIATONIC_SCORE) minorScores.forEach((s, i) => { if (s === maxMinor) selectedMinorKeys.push(i); });
    } else if (pcs.size >= 3) {
        // ── Chord mode: tonic-triad matching ─────────────────────────────────
        for (let i = 0; i < 12; i++) {
            if (pcs.has(MAJOR_ROOTS[i]) && [...pcs].every(pc => MAJOR_TONIC_SETS[i].has(pc))) selectedMajorKeys.push(i);
            if (pcs.has(MINOR_ROOTS[i]) && [...pcs].every(pc => MINOR_TONIC_SETS[i].has(pc))) selectedMinorKeys.push(i);
        }
    }

    return { selectedMajorKeys, selectedMinorKeys };
}

// ── Major/minor discriminator ─────────────────────────────────────────

/**
 * Post-processing step applied on top of the existing detection result.
 * When the result contains both a major key and its relative minor (same key
 * signature), the one whose root pitch class appears less frequently in the
 * 6-second long window is removed. If the frequencies are equal, or no long-
 * window data exists yet, both candidates are kept unchanged (original behaviour).
 */
function discriminateMajorMinor(
    result: KeyDetectionResult,
    longPcFreq: Map<number, number>,
): KeyDetectionResult {
    if (result.selectedMajorKeys.length === 0 || result.selectedMinorKeys.length === 0) {
        return result;
    }
    if (longPcFreq.size === 0) {
        return result;
    }

    const majorToRemove = new Set<number>();
    const minorToRemove = new Set<number>();

    // ── Relative pairs: major vs its relative minor (same key signature) ──────
    for (const majIdx of result.selectedMajorKeys) {
        const majRoot = MAJOR_ROOTS[majIdx];
        const relMinorRoot = (majRoot + 9) % 12;
        const relMinorIdx = result.selectedMinorKeys.find(mIdx => MINOR_ROOTS[mIdx] === relMinorRoot);
        if (relMinorIdx === undefined) continue;

        const majFreq = longPcFreq.get(majRoot) ?? 0;
        const minFreq = longPcFreq.get(relMinorRoot) ?? 0;
        if (majFreq > minFreq) {
            minorToRemove.add(relMinorIdx);
        } else if (minFreq > majFreq) {
            majorToRemove.add(majIdx);
        }
        // Equal frequencies → keep both (original behaviour)
    }

    // ── Parallel pairs: major vs minor with the same root (e.g. A-major / a-minor) ──
    // Disambiguate by comparing frequency of the major third vs minor third above the root.
    for (const majIdx of result.selectedMajorKeys) {
        if (majorToRemove.has(majIdx)) continue;
        const majRoot = MAJOR_ROOTS[majIdx];
        const parMinorIdx = result.selectedMinorKeys.find(
            mIdx => MINOR_ROOTS[mIdx] === majRoot && !minorToRemove.has(mIdx),
        );
        if (parMinorIdx === undefined) continue;

        const majorThirdFreq = longPcFreq.get((majRoot + 4) % 12) ?? 0;
        const minorThirdFreq = longPcFreq.get((majRoot + 3) % 12) ?? 0;
        if (majorThirdFreq > minorThirdFreq) {
            minorToRemove.add(parMinorIdx);
        } else if (minorThirdFreq > majorThirdFreq) {
            majorToRemove.add(majIdx);
        }
    }

    if (majorToRemove.size === 0 && minorToRemove.size === 0) {
        return result;
    }

    const filteredMajor = result.selectedMajorKeys.filter(i => !majorToRemove.has(i));
    const filteredMinor = result.selectedMinorKeys.filter(i => !minorToRemove.has(i));

    // Once a modal decision has been made, suppress the other mode entirely
    // to avoid mixing unrelated major and minor candidates.
    if (filteredMajor.length > 0 && filteredMinor.length === 0) {
        return { selectedMajorKeys: filteredMajor, selectedMinorKeys: [] };
    }
    if (filteredMinor.length > 0 && filteredMajor.length === 0) {
        return { selectedMajorKeys: [], selectedMinorKeys: filteredMinor };
    }
    return { selectedMajorKeys: filteredMajor, selectedMinorKeys: filteredMinor };
}
