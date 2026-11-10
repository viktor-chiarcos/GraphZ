import circuitsData from '../../docs/spec/circuits.json';
import colorsData from '../../docs/spec/colors.json';
import blocksData from '../../docs/spec/blocks.json';

export type Kit = 'Light' | 'Start' | 'Basic' | 'Mobile';
export type Mode = 'Newbie' | 'Expert';

export interface CircuitInfo {
  name: string;
  imgFileName: string;
}

export interface BlockSpec {
  field_names: string[];
  sample_tags: string[];
  sub_params_sample: string | null;
  iter_sample: string | null;
}

export const KITS: Kit[] = ['Light', 'Start', 'Basic', 'Mobile'];
export const MODES: Mode[] = ['Newbie', 'Expert'];

export const CIRCUITS = circuitsData as Record<Kit, Record<string, CircuitInfo>>;
export const COLORS = colorsData as unknown as Record<string, [number, number, number] | null>;
export const COLOR_NAMES = Object.keys(COLORS);
export const BLOCK_SPECS = blocksData as Record<string, BlockSpec>;

export const COLOR_OPTIONS: Array<[string, string]> = COLOR_NAMES.map((name) => [
  name,
  name,
]);

export function namedColorToRgb(name: string | null | undefined): [number, number, number] | null {
  if (!name) {
    return null;
  }
  const value = COLORS[name.trim()];
  return value ?? null;
}

export function rgbToHex(rgb: [number, number, number] | null | undefined): string {
  if (!rgb) {
    return '#000000';
  }
  const [r, g, b] = rgb.map((part) => Math.max(0, Math.min(255, Math.round(part)))) as [
    number,
    number,
    number,
  ];
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

export function hexToRgb(hex: string): [number, number, number] {
  const cleaned = hex.replace('#', '').trim();
  const value = cleaned.length === 3
    ? cleaned.split('').map((char) => char + char).join('')
    : cleaned.padEnd(6, '0').slice(0, 6);
  const parsed = Number.parseInt(value, 16);
  if (Number.isNaN(parsed)) {
    return [0, 0, 0];
  }
  return [(parsed >> 16) & 255, (parsed >> 8) & 255, parsed & 255];
}

export function tripletToHex(triplet: string | null | undefined): string {
  if (!triplet) {
    return '#000000';
  }
  const parts = triplet.split(',').map((part) => Number.parseInt(part.trim(), 10));
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
    return '#000000';
  }
  return rgbToHex([parts[0], parts[1], parts[2]]);
}

export function nearestColorName(triplet: string | null | undefined): string {
  if (!triplet) {
    return 'none';
  }
  const parts = triplet.split(',').map((part) => Number.parseInt(part.trim(), 10));
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
    return 'none';
  }
  let bestName = 'none';
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const [name, rgb] of Object.entries(COLORS)) {
    if (!rgb) {
      continue;
    }
    const distance = (rgb[0] - parts[0]) ** 2 + (rgb[1] - parts[1]) ** 2 + (rgb[2] - parts[2]) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      bestName = name;
    }
  }
  return bestName;
}

export function formatTriplet(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  return `${r},${g},${b}`;
}
