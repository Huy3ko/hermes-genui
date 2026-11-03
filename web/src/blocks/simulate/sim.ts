// The arithmetic behind a simulation: time on its steps, how much one dot stands for, and which colour each dot takes.

/** The most dots all piles together may draw; past it each dot stands for more. */
export const MAX_DOTS = 600;
// Without an amount per dot, about this many dots in all.
const DEFAULT_DOTS = 150;

/** Time rounded down to a whole step: (7.9, 1) → 7;  (7.9, 0.5) → 7.5 */
export function whole(t: number, step: number): number {
  return Math.round(Math.floor(t / step + 1e-9) * step * 1e9) / 1e9;
}

/** Every step from 0 to `to`: (2, 0.5) → [0, 0.5, 1, 1.5, 2] */
export function timesOf(to: number, step: number): number[] {
  const out: number[] = [];
  for (let k = 0; k * step <= to + 1e-9; k++) out.push(whole(k * step, step));
  return out;
}

/** The smallest of 1, 2 or 5 times a power of ten at or above `v`: 1.2 → 2;  4300 → 5000;  0.3 → 0.5 */
export function niceAbove(v: number): number {
  const power = 10 ** Math.floor(Math.log10(v));
  const m = v / power;
  return (m <= 1 + 1e-9 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * power;
}

/**
 * How much one dot stands for, given `most`, the largest the piles can add up to: the model's `per` while the piles
 * stay within MAX_DOTS, else (or with none) a round amount that fits.
 *   (10000, 3000000) → 10000 (300 dots);  (1000, 3000000) → 5000 (3000 would be too many);  (none, 3000000) → 20000
 */
export function dotPer(per: number | undefined, most: number): number {
  if (!(most > 0)) return per ?? 1;
  if (per !== undefined && most / per <= MAX_DOTS) return per;
  return niceAbove(most / (per === undefined ? DEFAULT_DOTS : MAX_DOTS));
}

/**
 * The colour (0 = the start, then 1, 2, … for each pile's own extra) of dot `n` in pile `k`, given the starting
 * amount's dots and every pile's dots. A dot the pile before also has takes that pile's colour, so each pile's extra
 * stands out.  start 10, piles 40 and 70: pile 1's dots 5, 25, 50 → 0, 1, 2
 */
export function dotColour(n: number, start: number, counts: number[], k: number): number {
  const bands = [start, ...counts.slice(0, k + 1)];
  const band = bands.findIndex((limit) => n < limit);
  return band < 0 ? k + 1 : band;
}
