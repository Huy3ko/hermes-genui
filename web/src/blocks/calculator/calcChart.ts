// A calculator's live chart: one or more series worked out at each step of an x range, from the sliders' values now.
// readCalcChart reads what the model wrote; calcChartSpec turns it into a chart (chartData.ts) on every slider move.
import { chartKind, type ChartSpec } from "../chart/chartData";
import { clean, firstList, firstText, keepFirst, num, str, type Trail } from "../../core/fields";
import { evaluate, isHelper, namesIn, newBudget, parseFormula, type Node } from "../../lib/formula";

/** A number, or a formula over the calculator's inputs ("n", "n * 12"). */
export type Bound = number | string;
export type CalcChart = {
  kind: "line" | "area" | "bar"; title?: string; unit?: string;
  x: { name: string; from: Bound; to: Bound; step: Bound; label?: string };
  series: { name: string; formula: string }[];
};

export const MAX_POINTS = 200;
const MAX_SERIES = 3;
// The work one chart may do (formula steps plus loan months, see lib/formula's Budget): 200 points × 3 series of a
// month-by-month helper over a 100-year term (1200 months) fit, with room for the rest of each formula. Past it the
// remaining points are gaps.
export const MAX_CHART_WORK = 1_000_000;
const ID = /^[A-Za-z_][A-Za-z0-9_]{0,23}$/;

/**
 * chart (optional, on a calculator) → the chart to work out, or undefined (noted) when it can't be drawn.
 * - kind: area or bar; anything else is a line.
 * - x: {name: the loop variable formulas use (not an input's id, not a helper's name), from (default 0), to, step
 *   (default 1): each a number or a formula over the inputs, label: a template where {name} is the value}.
 * - series (up to 3): [{name, formula (also `expr`)}]; one missing either is dropped (noted).
 *   {kind: "area", x: {name: "y", to: "n", label: "Year {y}"}, series: [{name: "Owed", formula: "balance(p, r, n, y)"}]}
 *   with inputs p, r, n → {kind: "area", x: {name: "y", from: 0, to: "n", step: 1, label: "Year {y}"}, series: [same]}
 *   x: {name: "d", …, label: "Night {y}"} → label "Night {d}" (labelFor)
 *   x: {name: "p", …} with an input p → undefined, noted 'x name "p" is an input's id'
 */
export function readCalcChart(raw: any, ids: string[], here: Trail): CalcChart | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return here.drop("chart must be an object") ?? undefined;
  const x = raw.x && typeof raw.x === "object" ? raw.x : {};
  const name = str(x.name, 24);
  const nameProblem = !name || !ID.test(name) ? 'x needs a name like "y"'
    : ids.includes(name) ? `x name "${name}" is an input's id`
    : isHelper(name) ? `x name "${name}" is a helper's name` : null;
  if (nameProblem) return here.drop(nameProblem) ?? undefined;
  const from = bound(x.from) ?? 0;
  const to = bound(x.to);
  const step = bound(x.step) ?? 1;
  if (to === null) return here.drop("x needs from, to and step (numbers or formulas)") ?? undefined;

  const series: CalcChart["series"] = [];
  (firstList([raw.series]) ?? []).forEach((s: any, i) => {
    const where = here.at("series").at(i);
    const label = firstText([s?.name, s?.label], 40);
    const formula = firstText([s?.formula, s?.expr], 300);
    if (!label || !formula) return where.drop("series needs a name and a formula");
    noteUnknownNames(formula, [...ids, name!], where);
    series.push({ name: label, formula });
  });
  if (!series.length) return here.drop("chart has no usable series") ?? undefined;
  const kind = chartKind(raw.kind);
  return clean({
    kind: kind === "area" || kind === "bar" ? kind : "line" as const,
    title: firstText([raw.title], 80), unit: firstText([raw.unit], 12),
    x: clean({ name: name!, from, to, step, label: labelFor(firstText([x.label], 40), name!) }),
    series: keepFirst(series, MAX_SERIES, here, "series"),
  });
}

/**
 * x's label with the value's place written as {name}, however the model named it: a label's one placeholder is the
 * value's place whatever is in it; with several, only {name} is, and every other brace is dropped.
 *   ("Night {y}", "d") → "Night {d}";  ("Night {d} of {n}", "d") → "Night {d} of n";  ("{a} to {b}", "d") → "a to b"
 *   ("Night {", "d") → "Night";  ("{", "d") → undefined
 */
function labelFor(label: string | undefined, name: string): string | undefined {
  if (!label) return undefined;
  const place = `{${name}}`;
  const placeholders = label.match(/\{[^{}]*\}/g) ?? [];
  const named = placeholders.length === 1 ? label.replace(placeholders[0], place) : label;
  return named.split(place).map((part) => part.replace(/[{}]/g, "")).join(place).trim() || undefined;
}

/** One end or step of the range: a number, or a formula's text; null when it's neither. 5 → 5; " n " → "n"; true → null */
function bound(v: unknown): Bound | null {
  return num(v) ?? str(v, 300) ?? null;
}

/** Notes a series formula that can't be read or uses a name nothing has (its points will be gaps). */
function noteUnknownNames(formula: string, known: string[], here: Trail): void {
  try {
    const unknown = namesIn(parseFormula(formula)).filter((n) => !known.includes(n));
    if (unknown.length) here.drop(`formula uses ${unknown.join(", ")}, which no input has; leaves gaps`);
  } catch (e) {
    here.drop(`formula can't be read (${(e as Error).message}); leaves gaps`);
  }
}

/**
 * The chart to draw for the sliders' values now, or null when there's nothing to draw (the range can't be worked out,
 * is empty or backwards, or no point of any series can). A series whose formula fails at a point has a gap there.
 * Past 200 points the step is multiplied up until the points fit (pointsAlong). All of it shares one budget of
 * MAX_CHART_WORK operations: once spent, every point still to work out is a gap (a slow formula can't hang the page).
 *   x {name: "y", from: 0, to: "n", step: 1, label: "Year {y}"}, series balance(p, r, n, y), with p = 4000000,
 *   r = 8.5, n = 20 → x ["Year 0" … "Year 20"], data [4000000, 3920391, … 0]
 */
export function calcChartSpec(chart: CalcChart, values: ReadonlyMap<string, number>): ChartSpec | null {
  const budget = newBudget(MAX_CHART_WORK);
  const at = (b: Bound) => (typeof b === "number" ? b : evaluate(b, values, budget));
  const from = at(chart.x.from), to = at(chart.x.to), step = at(chart.x.step);
  if (from === null || to === null || step === null) return null;
  const xs = pointsAlong(from, to, step);
  if (!xs.length) return null;
  const trees = chart.series.map((s) => tryParse(s.formula));
  const series = chart.series.map((s, k) => {
    const data = xs.map((xv) => {
      const tree = trees[k];
      return tree ? evaluate(tree, new Map(values).set(chart.x.name, xv), budget) : null;
    });
    return { name: s.name, data, right: false };
  });
  if (series.every((s) => s.data.every((v) => v === null))) return null;
  const label = (xv: number) => (chart.x.label ? chart.x.label.split(`{${chart.x.name}}`).join(String(xv)) : String(xv));
  // The area drawing stacks its series (each on top of the last). For what-if curves like "balance" and "interest
  // paid" a stack would add unrelated amounts, so several series are drawn as plain lines: area with 1 series → area;
  // area with 2 series → line.
  const type = chart.kind === "area" && series.length > 1 ? "line" : chart.kind;
  return clean({ type, title: chart.title, x: xs.map(label), series, unit: chart.unit, figure: false });
}

/**
 * The x values from `from` to `to` (inclusive) a `step` apart, at most 200 of them: past that the step is multiplied
 * by the smallest whole number that makes them fit, so whole steps stay whole. Empty when the step isn't above 0 or the
 * range runs backwards. Rounded to 9 places so 0.1 steps don't show 0.30000000000000004.
 *   (0, 20, 1) → [0, 1, … 20] (21 values);  (0, 1, 0.25) → [0, 0.25, 0.5, 0.75, 1];  (0, 1000, 1) → [0, 6, 12, … 996];  (5, 1, 1) → []
 */
export function pointsAlong(from: number, to: number, step: number): number[] {
  if (!(step > 0) || to < from) return [];
  const count = (s: number) => Math.floor((to - from) / s + 1e-9) + 1;
  let s = step;
  if (count(s) > MAX_POINTS) s = step * Math.ceil(count(s) / MAX_POINTS);
  if (!Number.isFinite(count(s))) return [];
  const n = Math.min(count(s), MAX_POINTS);  // in case rounding still leaves one too many
  return Array.from({ length: n }, (_, i) => Math.round((from + i * s) * 1e9) / 1e9);
}

/** The formula's tree, or null when it can't be read (every point of that series is then a gap). */
function tryParse(formula: string): Node | null {
  try {
    return parseFormula(formula);
  } catch {
    return null;
  }
}
