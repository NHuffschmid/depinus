import { useMemo } from 'react';

// ── Constants ────────────────────────────────────────────────────────────────

/**
 * Minimum number of pressed notes that must match a key's diatonic scale
 * before that key is highlighted. Prevents spurious matches on 1–2 notes.
 */
const MIN_MATCHING_NOTES = 3;

/**
 * Diatonic major scales expressed as sets of pitch-classes (0 = C, 1 = C#, …).
 * Ordered by the circle of fifths (index 0 = C, 1 = G, 2 = D, …), matching
 * the segment indices used by CircleOfFifths.
 *
 * Circle-of-fifths order: C G D A E B F# C# G# D# A# F
 */
const MAJOR_SCALE_PITCH_CLASSES: number[][] = [
    [0, 2, 4, 5, 7, 9, 11],  // C  major
    [7, 9, 11, 0, 2, 4, 6],  // G  major
    [2, 4, 6, 7, 9, 11, 1],  // D  major
    [9, 11, 1, 2, 4, 6, 8],  // A  major
    [4, 6, 8, 9, 11, 1, 3],  // E  major
    [11, 1, 3, 4, 6, 8, 10], // B  major
    [6, 8, 10, 11, 1, 3, 5], // F# major
    [1, 3, 5, 6, 8, 10, 0],  // C# major
    [8, 10, 0, 1, 3, 5, 7],  // G# major  (Ab)
    [3, 5, 7, 8, 10, 0, 2],  // D# major  (Eb)
    [10, 0, 2, 3, 5, 7, 9],  // A# major  (Bb)
    [5, 7, 9, 10, 0, 2, 4],  // F  major
];

/**
 * Natural minor scales (Aeolian mode).
 * The relative minor of index i shares the same 7 pitch-classes as major[i],
 * so the two will always be highlighted together — which is musically correct
 * when the information is ambiguous.
 *
 * Circle-of-fifths minor order: a e b f# c# g# d# a# f c g d
 */
const MINOR_SCALE_PITCH_CLASSES: number[][] = [
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
];

// Pre-compute as Sets for O(1) lookup.
const MAJOR_SETS = MAJOR_SCALE_PITCH_CLASSES.map(pcs => new Set(pcs));
const MINOR_SETS = MINOR_SCALE_PITCH_CLASSES.map(pcs => new Set(pcs));

// ── Types ────────────────────────────────────────────────────────────────────

export interface KeyDetectionResult {
    /** Circle-of-fifths indices of detected major keys (empty = none). */
    selectedMajorKeys: number[];
    /** Circle-of-fifths indices of detected minor keys (empty = none). */
    selectedMinorKeys: number[];
}

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Derives the most likely key(s) from a set of currently pressed MIDI notes.
 *
 * Algorithm:
 *  1. Reduce notes to pitch-classes (note % 12) to ignore octave.
 *  2. For each of the 12 major / 12 minor keys count how many pressed
 *     pitch-classes belong to that key's diatonic scale.
 *  3. Keep only keys whose count equals the maximum AND is >= MIN_MATCHING_NOTES.
 *  4. Return those indices so CircleOfFifths can highlight them.
 */
export function useKeyDetection(pressedNotes: Set<number>): KeyDetectionResult {
    return useMemo(() => {
        if (pressedNotes.size === 0) {
            return { selectedMajorKeys: [], selectedMinorKeys: [] };
        }

        // Reduce to unique pitch-classes.
        const pitchClasses = new Set<number>();
        for (const note of pressedNotes) {
            pitchClasses.add(note % 12);
        }

        // Count overlap for each key.
        const majorScores = MAJOR_SETS.map(scale => {
            let count = 0;
            for (const pc of pitchClasses) {
                if (scale.has(pc)) count++;
            }
            return count;
        });

        const minorScores = MINOR_SETS.map(scale => {
            let count = 0;
            for (const pc of pitchClasses) {
                if (scale.has(pc)) count++;
            }
            return count;
        });

        const maxMajor = Math.max(...majorScores);
        const maxMinor = Math.max(...minorScores);

        const selectedMajorKeys = maxMajor >= MIN_MATCHING_NOTES
            ? majorScores.map((s, i) => s === maxMajor ? i : -1).filter(i => i !== -1)
            : [];

        const selectedMinorKeys = maxMinor >= MIN_MATCHING_NOTES
            ? minorScores.map((s, i) => s === maxMinor ? i : -1).filter(i => i !== -1)
            : [];

        return { selectedMajorKeys, selectedMinorKeys };
    }, [pressedNotes]);
}
