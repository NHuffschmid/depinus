import { Measure } from '../types';

/**
 * Returns the pitch classes (0-11) that are in the diatonic scale for a given key signature.
 * @param fifths - Key signature in fifths notation (-7 to +7)
 * @returns Set of pitch classes (0=C, 1=C#, 2=D, etc.)
 */
function getScaleNotesForKey(fifths: number): Set<number> {
  // Major scale pattern: Whole, Whole, Half, Whole, Whole, Whole, Half
  // In semitones: 0, 2, 4, 5, 7, 9, 11
  const majorScalePattern = [0, 2, 4, 5, 7, 9, 11];
  
  // Map fifths to tonic pitch class (0-11)
  // Circle of fifths: C(0), G(7), D(2), A(9), E(4), B(11), F#(6), C#(1)
  //                   F(5), Bb(10), Eb(3), Ab(8), Db(1), Gb(6), Cb(11)
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
  
  const tonic = fifthsToTonic[fifths + 7]; // Offset by 7 to handle negative indices
  
  // Build scale from tonic
  const scaleNotes = new Set<number>();
  for (const interval of majorScalePattern) {
    scaleNotes.add((tonic + interval) % 12);
  }
  
  return scaleNotes;
}

/**
 * Converts a note (step, alter) to pitch class (0-11).
 * @param step - Note step (C, D, E, F, G, A, B)
 * @param alter - Alteration (-2 to +2)
 * @returns Pitch class (0-11)
 */
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

/**
 * Detects all key signatures with the minimum number of deviations for a measure.
 * @param measure - The measure to analyze
 * @returns Array of key signatures in fifths notation (-7 to +7) with the fewest deviations, or [0] (C major) if no notes
 */
export function detectKeysForMeasure(measure: Measure): number[] {
  const notes = measure.notes.filter(note => !note.isRest);
  if (notes.length === 0) return [0]; // Default to C major

  // Extract pitch classes from notes in the measure
  const pitchClasses = notes.map(note => noteToPitchClass(note.step, note.alter));

  let minDeviations = Infinity;
  const keyDeviations: { key: number; deviations: number }[] = [];

  // Test all possible keys (-7 to +7)
  for (let fifths = -7; fifths <= 7; fifths++) {
    const scaleNotes = getScaleNotesForKey(fifths);
    let deviations = 0;
    for (const pitchClass of pitchClasses) {
      if (!scaleNotes.has(pitchClass)) {
        deviations++;
      }
    }
    keyDeviations.push({ key: fifths, deviations });
    if (deviations < minDeviations) {
      minDeviations = deviations;
    }
  }

  // Return all keys with the minimum number of deviations
  return keyDeviations.filter(kd => kd.deviations === minDeviations).map(kd => kd.key);
}
