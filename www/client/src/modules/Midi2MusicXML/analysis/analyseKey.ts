/**
 * Key detection algorithm for MusicXML conversion
 *
 * This module provides a function to automatically determine the most likely key signature (major or minor)
 * for a given section of music, based on the note content. The algorithm works as follows:
 *
 * 1. All notes in the section are collected and converted to pitch classes (0-11).
 * 2. For each possible key signature (-7 to +7 fifths, covering all major and parallel minor keys):
 *    a. The number of notes matching the diatonic scale of the key is counted.
 *    b. The number of tonic (root) notes for both major and minor is counted and added as a bonus.
 *    c. For minor keys, the number of raised 7th degree (Leitton) notes is counted and multiplied by a bonus factor.
 *    d. The total score for each key is the sum of scale matches, tonic bonus, and Leitton bonus (for minor).
 * 3. The key with the highest score is selected as the detected key. If there is a tie, major keys are preferred.
 * 4. The result is returned as a string (e.g. '2M' for D major, '2m' for B minor) and stored in section.attributes.key.
 *
 * This approach improves reliability for both major and minor keys, especially in ambiguous cases, by considering
 * not only the scale but also the musical importance of tonic and Leitton notes.
 */

import { Section, Note } from '../types';

/**
 * Analyzes all measures in a section and determines the most common key candidate.
 * Sets this key as the section's attributes.key property and returns it.
 *
 * @param section The section to analyze and modify
 * @returns The most common key (e.g. '2M' for D major, '2m' for B minor)
 */
export function analyseKey(section: Section): string {
  const majorScalePattern = [0, 2, 4, 5, 7, 9, 11];
  const fifthsToTonic = [
  11, // -7: Cb
  6,  // -6: Gb
  1,  // -5: Db
  8,  // -4: Ab
  3,  // -3: Eb
  10, // -2: Bb
  5,  // -1: F
  0,  //  0: C
  7,  // +1: G
  2,  // +2: D
  9,  // +3: A
  4,  // +4: E
  11, // +5: B
  6,  // +6: F#
  1,  // +7: C#
];
  function getScaleNotesForKey(fifths: number): Set<number> {
    const tonic = fifthsToTonic[fifths + 7];
    const scaleNotes = new Set<number>();
    for (const interval of majorScalePattern) {
      scaleNotes.add((tonic + interval) % 12);
    }
    return scaleNotes;
  }
  function noteToPitchClass(step: string, alter?: number): number {
    const stepToPitch: Record<string, number> = {
      'C': 0,
      'D': 2,
      'E': 4,
      'F': 5,
      'G': 7,
      'A': 9,
      'B': 11,
    };
    const basePitch = stepToPitch[step.toUpperCase()] ?? 0;
    const alteration = alter ?? 0;
    return (basePitch + alteration + 12) % 12;
  }

  // Collect all notes of the section
  const allNotes: Note[] = section.measures?.flatMap(m => m.notes) ?? [];
  const notePitchClasses = allNotes.filter(n => !n.isRest).map(n => noteToPitchClass(n.step, n.alter));

  if (notePitchClasses.length === 0) {
    if (!section.attributes) section.attributes = {};
    section.attributes.key = '0M';
    console.log('[analyseKey] No notes found, defaulting to key 0M (C major)');
    return '0M';
  }


  // For each key: count how many notes fit into the scale, plus tonic weighting for both major and parallel minor
  const keyMatches: Record<string, number> = {};
  const tonicCounts: Record<string, number> = {};
  const BONUS_FACTOR = 3;
  const leittonCounts: Record<string, number> = {};
  for (let fifths = -7; fifths <= 7; fifths++) {
    // Major
    const scaleNotesMajor = getScaleNotesForKey(fifths);
    let matchesMajor = 0;
    for (const pc of notePitchClasses) {
      if (scaleNotesMajor.has(pc)) matchesMajor++;
    }
    const tonicMajor = fifthsToTonic[fifths + 7];
    const tonicCountMajor = notePitchClasses.filter(pc => pc === tonicMajor).length;
    const keyMajor = `${fifths}M`;
    tonicCounts[keyMajor] = tonicCountMajor;
    keyMatches[keyMajor] = matchesMajor + tonicCountMajor;

    // Parallel minor: tonic is 9 steps below major tonic (relative minor)
    const tonicMinor = (tonicMajor + 9) % 12;
    // Minor scale: use natural minor scale pattern: [0, 2, 3, 5, 7, 8, 10]
    const naturalMinorPattern = [0, 2, 3, 5, 7, 8, 10];
    const scaleNotesMinor = new Set<number>();
    for (const interval of naturalMinorPattern) {
      scaleNotesMinor.add((tonicMinor + interval) % 12);
    }
    let matchesMinor = 0;
    for (const pc of notePitchClasses) {
      if (scaleNotesMinor.has(pc)) matchesMinor++;
    }
    const tonicCountMinor = notePitchClasses.filter(pc => pc === tonicMinor).length;
    // Leitton for minor: raised 7th degree (tonic + 11) % 12
    const leittonMinor = (tonicMinor + 11) % 12;
    const leittonCountMinor = notePitchClasses.filter(pc => pc === leittonMinor).length;
    const keyMinor = `${fifths}m`;
    tonicCounts[keyMinor] = tonicCountMinor;
    leittonCounts[keyMinor] = leittonCountMinor;
    keyMatches[keyMinor] = matchesMinor + tonicCountMinor + leittonCountMinor * BONUS_FACTOR;
  }

  // Log tonic and leitton counts for both major and minor
  const tonicLog = Object.entries(tonicCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => `${key}: ${count}`)
    .join(', ');
  const leittonLog = Object.entries(leittonCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => `${key}: ${count}`)
    .join(', ');

  // Determine the key(s) with the most matches (including tonic bonus)
  const maxMatches = Math.max(...Object.values(keyMatches));
  const bestKeys = Object.entries(keyMatches)
    .filter(([_, count]) => count === maxMatches)
    .map(([key]) => key);

  // Log the analysis sorted
  const sortedCounts = Object.entries(keyMatches)
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => `${key}: ${count}`)
    .join(', ');
  console.log(`[analyseKey] key matches (with tonic bonus, desc): { ${sortedCounts} }`);

  // Choose the first best key (prefer major if tie, then minor)
  let bestKey = bestKeys.find(k => k.endsWith('M')) ?? bestKeys[0] ?? '0M';

  if (!section.attributes) section.attributes = {};
  (section.attributes as any).key = bestKey;
  return bestKey;
}
