import { Section } from '../types';

/**
 * Analyzes all measures in a section and determines the most common key candidate.
 * Sets this key as the section's attributes.key property and returns it.
 *
 * @param section The section to analyze and modify
 * @returns The most common key (fifths notation, -7 to +7), or 0 if no measures or tie
 */
import { Note } from '../types';

// Helper functions for scales and pitch classes
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

export function analyseKey(section: Section): number {
  // Collect all notes of the section
  const allNotes: Note[] = section.measures?.flatMap(m => m.notes) ?? [];
  const notePitchClasses = allNotes.filter(n => !n.isRest).map(n => noteToPitchClass(n.step, n.alter));

  if (notePitchClasses.length === 0) {
    if (!section.attributes) section.attributes = {};
    section.attributes.key = 0;
    console.log('[analyseKey] No notes found, defaulting to key 0 (C major)');
    return 0;
  }

  // For each key: count how many notes fit into the scale
  const keyMatches: Record<number, number> = {};
  for (let fifths = -7; fifths <= 7; fifths++) {
    const scaleNotes = getScaleNotesForKey(fifths);
    let matches = 0;
    for (const pc of notePitchClasses) {
      if (scaleNotes.has(pc)) matches++;
    }
    keyMatches[fifths] = matches;
  }

  // Determine the key(s) with the most matches
  const maxMatches = Math.max(...Object.values(keyMatches));
  const bestKeys = Object.entries(keyMatches)
    .filter(([_, count]) => count === maxMatches)
    .map(([key]) => parseInt(key, 10));

  // Log the analysis sorted
  const sortedCounts = Object.entries(keyMatches)
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => `${key}: ${count}`)
    .join(', ');
  console.log(`[analyseKey] key matches (desc): { ${sortedCounts} }`);

  // Choose the first (or 0 if tie and 0 is present)
  let bestKey = bestKeys[0] ?? 0;
  if (bestKeys.includes(0)) bestKey = 0;

  if (!section.attributes) section.attributes = {};
  section.attributes.key = bestKey;
  return bestKey;
}
