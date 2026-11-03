// The colour of one heatmap cell. Diverging: losses shade towards the warn colour and gains towards the good colour,
// the deeper the bigger; sequential: the accent colour, light to dark. Each is mixed with transparent so it sits on the
// card in light and dark mode alike, and stops at 70% so the cell's number (in the ink colour) stays readable.

export type HeatRange = { low: number; high: number };

const FAINT = 10;  // % of the colour for the smallest value, so even a zero cell reads as part of the grid
const DEEP = 70;   // % for the biggest

/** The lowest and highest numbers in the grid (nulls skipped): [[4, -1], [null, 7]] → {low: -1, high: 7}; all null → {low: 0, high: 0}. */
export function rangeOf(values: (number | null)[][]): HeatRange {
  let low = Infinity;
  let high = -Infinity;
  for (const row of values) {
    for (const v of row) {
      if (v === null) continue;
      low = Math.min(low, v);
      high = Math.max(high, v);
    }
  }
  if (low === Infinity) return { low: 0, high: 0 };
  return { low, high };
}

/**
 * A cell's background as CSS. Diverging shades by size against the biggest number either side of zero, so -5 next to
 * +10 is half as deep: the shades stay comparable. Worked examples (range low -10, high 10):
 *   null, any scale  → "var(--hb-well)" (no number: the plain well)
 *   -10, diverging   → --hb-warn at 70% (the biggest loss, deepest)
 *   10, diverging    → --hb-good at 70% (the biggest gain, deepest)
 *   5, diverging     → --hb-good at 40% (half as big as the biggest)
 *   0, diverging     → --hb-good at 10% (faint)
 *   -10, sequential  → --hb-accent at 10% (the lowest value, faintest)
 *   10, sequential   → --hb-accent at 70%
 */
export function cellColour(value: number | null, range: HeatRange, scale: "diverging" | "sequential"): string {
  if (value === null) return "var(--hb-well)";
  let colour: string;
  let share: number;  // 0 (faint) to 1 (deep)
  if (scale === "diverging") {
    const biggest = Math.max(Math.abs(range.low), Math.abs(range.high));
    colour = value < 0 ? "--hb-warn" : "--hb-good";
    share = biggest === 0 ? 0 : Math.abs(value) / biggest;
  } else {
    const span = range.high - range.low;
    colour = "--hb-accent";
    share = span === 0 ? 1 : (value - range.low) / span;
  }
  const percent = Math.round(FAINT + (DEEP - FAINT) * share);
  return `color-mix(in srgb, var(${colour}) ${percent}%, transparent)`;
}

/** A cell's number as text: 4.125 → "4.1"; 7 → "7"; with unit "%" → "4.1%"; with unit "h" → "4.1 h"; null → "–". */
export function cellText(value: number | null, unit?: string): string {
  if (value === null) return "–";
  const text = Number.isInteger(value) ? String(value) : value.toFixed(1);
  if (!unit) return text;
  if (unit === "%") return `${text}%`;
  return `${text} ${unit}`;
}
