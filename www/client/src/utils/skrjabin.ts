// Skrjabin color utilities

import { getSkrjabinColor } from '../components/react-piano-keyboard/src/Keyboard';

// Re-export Skrjabin color scale and color function from Keyboard component
export { skrjabinColors, getSkrjabinColor } from '../components/react-piano-keyboard/src/Keyboard';

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
