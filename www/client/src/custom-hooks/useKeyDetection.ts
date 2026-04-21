import { useMemo } from 'react';

// ── Constants ────────────────────────────────────────────────────────────────

/** Unique pitch classes needed to use diatonic-scale detection (passage mode). */
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
 * Hybrid key detection from a sliding 2-second window of MIDI note-on events.
 *
 * Mode A — Chord (3–4 unique pitch classes):
 *   Tonic-triad matching. The root must be present and ALL pressed pitch classes
 *   must fit the tonic triad. This uniquely identifies C-E-G → C major.
 *
 * Mode B — Passage (5+ unique pitch classes):
 *   Diatonic scale overlap. Returns every key whose scale contains at least
 *   MIN_DIATONIC_SCORE of the pressed pitch classes, provided that score equals
 *   the maximum across all 24 keys. Works well during playback of real pieces.
 */
export function useKeyDetection(pressedNotes: Set<number>): KeyDetectionResult {
    return useMemo(() => {
        if (pressedNotes.size === 0) {
            return { selectedMajorKeys: [], selectedMinorKeys: [] };
        }

        // Reduce to unique pitch-classes.
        const pcs = new Set<number>();
        for (const note of pressedNotes) pcs.add(note % 12);

        const selectedMajorKeys: number[] = [];
        const selectedMinorKeys: number[] = [];

        if (pcs.size >= MIN_DIATONIC_PCS) {
            // ── Passage mode: diatonic overlap ───────────────────────────────
            const majorScores = MAJOR_SCALE_SETS.map(scale => {
                let n = 0;
                for (const pc of pcs) if (scale.has(pc)) n++;
                return n;
            });
            const minorScores = MINOR_SCALE_SETS.map(scale => {
                let n = 0;
                for (const pc of pcs) if (scale.has(pc)) n++;
                return n;
            });

            const maxMajor = Math.max(...majorScores);
            const maxMinor = Math.max(...minorScores);

            if (maxMajor >= MIN_DIATONIC_SCORE) {
                majorScores.forEach((s, i) => { if (s === maxMajor) selectedMajorKeys.push(i); });
            }
            if (maxMinor >= MIN_DIATONIC_SCORE) {
                minorScores.forEach((s, i) => { if (s === maxMinor) selectedMinorKeys.push(i); });
            }
        } else if (pcs.size >= 3) {
            // ── Chord mode: tonic-triad matching ─────────────────────────────
            for (let i = 0; i < 12; i++) {
                if (pcs.has(MAJOR_ROOTS[i]) && [...pcs].every(pc => MAJOR_TONIC_SETS[i].has(pc))) {
                    selectedMajorKeys.push(i);
                }
                if (pcs.has(MINOR_ROOTS[i]) && [...pcs].every(pc => MINOR_TONIC_SETS[i].has(pc))) {
                    selectedMinorKeys.push(i);
                }
            }
        }

        return { selectedMajorKeys, selectedMinorKeys };
    }, [pressedNotes]);
}
