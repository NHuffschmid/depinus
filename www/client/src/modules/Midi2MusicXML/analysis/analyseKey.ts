import { Section } from '../types';

/**
 * Analyzes all measures in a section and determines the most common key candidate.
 * Sets this key as the section's attributes.key property and returns it.
 *
 * @param section The section to analyze and modify
 * @returns The most common key (fifths notation, -7 to +7), or 0 if no measures or tie
 */
export function analyseKey(section: Section): number {
  if (!section.measures || section.measures.length === 0) {
    if (!section.attributes) section.attributes = {};
    section.attributes.key = 0;
    console.log('[analyseKey] mostCommonKeys: [] (no measures)');
    return 0;
  }

  // Count occurrences of each key candidate across all measures
  const keyCount: Record<number, number> = {};
  for (const measure of section.measures) {
    if (Array.isArray(measure.keyCandidates)) {
      for (const candidate of measure.keyCandidates) {
        keyCount[candidate] = (keyCount[candidate] || 0) + 1;
      }
    }
  }


  // Log occurrences for each key
  if (Object.keys(keyCount).length === 0) {
    console.log('[analyseKey] keyCandidate counts: {} (no key candidates found)');
  } else {
    const sortedCounts = Object.entries(keyCount)
      .sort((a, b) => b[1] - a[1])
      .map(([key, count]) => `${key}: ${count}`)
      .join(', ');
    console.log(`[analyseKey] keyCandidate counts (desc): { ${sortedCounts} }`);
  }

  // Find the key(s) with the most occurrences
  let maxCount = 0;
  for (const count of Object.values(keyCount)) {
    if (count > maxCount) maxCount = count;
  }
  const mostCommonKeys = Object.entries(keyCount)
    .filter(([_, count]) => count === maxCount)
    .map(([key]) => parseInt(key, 10));

  // Pick the first (or 0 if tie and 0 is present)
  let mostCommonKey = mostCommonKeys[0] ?? 0;
  if (mostCommonKeys.includes(0)) mostCommonKey = 0;

  if (!section.attributes) section.attributes = {};
  section.attributes.key = mostCommonKey;
  return mostCommonKey;
}
