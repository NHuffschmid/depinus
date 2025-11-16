// Skrjabin color utilities

/**
 * Skrjabin's synesthetic color scale (Wikipedia)
 * Index: MIDI note % 12
 */
export const skrjabinColors: string[] = [
  '#ff0000', // C
  '#ce9aff', // C#
  '#ffff00', // D
  '#656599', // D#
  '#e3fbff', // E
  '#ac1c02', // F
  '#00ccff', // F#
  '#ff6501', // G
  '#ff00ff', // G#
  '#33cc33', // A
  '#8c8a8c', // A#
  '#0000fe'  // B/H
];

/**
 * Returns the Skrjabin color for a given MIDI note.
 */
export function getSkrjabinColor(note: number): string {
  const noteInOctave = note % 12;
  return skrjabinColors[noteInOctave] || '#888888';
}

/**
 * Converts a hex color string to an [r,g,b] tuple.
 */
export function hexToRgb(hex: string): [number, number, number] {
  hex = hex.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map(x => x + x).join('');
  }
  const num = parseInt(hex, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

/**
 * Converts an [r,g,b] tuple to a hex color string.
 */
export function rgbToHex([r, g, b]: [number, number, number]): string {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

/**
 * Computes the mean RGB color of all pressed notes using Skrjabin's color scale.
 *
 * Mathematical formula:
 *
 *   R = (1/n) * Σ R_i
 *   G = (1/n) * Σ G_i
 *   B = (1/n) * Σ B_i
 *
 * where n = number of pressed notes, R_i/G_i/B_i = color channels of the Skrjabin color for the i-th note
 */
export function computeAvgSkrjabinColor(notes: Set<number>): string {
  if (notes.size === 0) return '#000000';
  let rSum = 0, gSum = 0, bSum = 0;
  for (const note of notes) {
    const [r, g, b] = hexToRgb(getSkrjabinColor(note));
    rSum += r;
    gSum += g;
    bSum += b;
  }
  const n = notes.size;
  return rgbToHex([
    Math.round(rSum / n),
    Math.round(gSum / n),
    Math.round(bSum / n)
  ]);
}
