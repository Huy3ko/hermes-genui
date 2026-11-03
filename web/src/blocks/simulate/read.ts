// simulate: a formula played over time. The calculator's sliders and formulas (lib/formula.ts), with a time that runs.
import { clean, firstList, firstText, keepFirst, num, str, type Trail } from "../../core/fields";
import { isHelper, namesIn, parseFormula } from "../../lib/formula";
import { readInput, type CalcInput } from "../calculator/read";

export type SimTime = { name: string; to: number; step: number; unit?: string; seconds: number };
export type SimPile = { name: string; formula: string; adds?: string };
export type SimulateBlock = {
  type: "simulate"; title?: string; t: SimTime; inputs: CalcInput[]; values: [string, number][];
  view: "dots" | "chart"; per?: number; start?: string; piles: SimPile[]; unit?: string; source?: string;
};

const ID = /^[A-Za-z_][A-Za-z0-9_]{0,23}$/;
const MAX_INPUTS = 4;
const MAX_VALUES = 8;
const MAX_PILES = 3;
const MAX_STEPS = 1000;
const MAX_SECONDS = 60;
const DEFAULT_SECONDS = 10;

/**
 * simulate: time `t` {name, to (above 0), step (default 1; coarser when there would be more than 1000), unit, speed:
 * t per second}, up to 4 sliders (the calculator's, keyed by `name`), up to 8 fixed `values` {name: number}, and a
 * view {kind: "chart", else dots; per: the amount one dot is; start: a label for the starting amount; piles (also
 * `series`): up to 3 {name, formula, adds}}. A name used twice or taken by a helper is left out (noted); a pile whose
 * formula can't be read or uses a name nothing gives is dropped (noted). The run takes to ÷ speed seconds (10 without
 * a speed), at most 60.
 *   {type: "simulate", t: {name: "y", to: 30, speed: 3}, values: {P: 100}, view: {piles: [{name: "Grows", formula: "P * 1.1 ^ y"}]}}
 *   → {type: "simulate", t: {name: "y", to: 30, step: 1, seconds: 10}, inputs: [], values: [["P", 100]], view: "dots",
 *      piles: [{name: "Grows", formula: "P * 1.1 ^ y"}]}
 * Dropped: no usable time, or no pile left.
 */
export function readSimulate(raw: any, here: Trail): SimulateBlock | null {
  const t = readTime(raw.t);
  if (!t) return here.drop("t needs a name (not a helper's) and to above 0");
  const taken = new Set([t.name]);
  const values: [string, number][] = [];
  const rawValues = raw.values && typeof raw.values === "object" && !Array.isArray(raw.values) ? raw.values : {};
  for (const [name, v] of Object.entries(rawValues)) {
    const n = num(v);
    if (!ID.test(name) || isHelper(name) || taken.has(name) || n === null) {
      here.at("values").drop(`value "${name}" left out: a new name and a number, please`);
      continue;
    }
    taken.add(name);
    values.push([name, n]);
  }
  const inputs: CalcInput[] = [];
  (firstList([raw.inputs, raw.sliders]) ?? []).forEach((item, i) => {
    const input = readInput(item, here.at("inputs").at(i));
    if (!input) return;
    if (taken.has(input.id)) return here.at("inputs").at(i).drop(`name "${input.id}" is used twice`);
    taken.add(input.id);
    inputs.push(input);
  });
  const view = raw.view && typeof raw.view === "object" ? raw.view : {};
  const piles: SimPile[] = [];
  (firstList([view.piles, view.series, raw.piles, raw.series]) ?? []).forEach((p: any, i) => {
    const pile = readPile(p, taken, here.at("view").at("piles").at(i));
    if (pile) piles.push(pile);
  });
  if (!piles.length) return here.drop("simulate has no pile it can work out");
  const per = num(view.per);
  return clean({
    type: "simulate" as const, title: firstText([raw.title], 80), t, inputs: keepFirst(inputs, MAX_INPUTS, here, "inputs"),
    values: keepFirst(values, MAX_VALUES, here, "values"), view: view.kind === "chart" ? "chart" as const : "dots" as const,
    per: per !== null && per > 0 ? per : undefined, start: str(view.start, 40), piles: keepFirst(piles, MAX_PILES, here, "piles"),
    unit: str(raw.unit, 12), source: str(raw.source, 120),
  });
}

/** {name: "years", to: 30, speed: 1.25} → {name: "years", to: 30, step: 1, seconds: 24};  {name: "emi", to: 3} → null */
function readTime(raw: any): SimTime | null {
  if (!raw || typeof raw !== "object") return null;
  const name = str(raw.name, 24);
  const to = num(raw.to);
  if (!name || !ID.test(name) || isHelper(name) || to === null || to <= 0) return null;
  const given = num(raw.step);
  const step = Math.max(given !== null && given > 0 ? given : 1, to / MAX_STEPS);
  const speed = num(raw.speed);
  const seconds = speed !== null && speed > 0 ? Math.min(MAX_SECONDS, to / speed) : DEFAULT_SECONDS;
  return clean({ name, to, step, unit: str(raw.unit, 12), seconds });
}

/** One pile; null (noted) without a name and a formula, or when the formula can't be read or uses an unknown name. */
function readPile(p: any, names: Set<string>, here: Trail): SimPile | null {
  const name = firstText([p?.name, p?.label], 40);
  const formula = firstText([p?.formula, p?.expr], 300);
  if (!name || !formula) return here.drop("pile needs a name and a formula");
  try {
    const unknown = namesIn(parseFormula(formula)).filter((n) => !names.has(n));
    if (unknown.length) return here.drop(`formula uses ${unknown.join(", ")}, which nothing gives`);
  } catch (e) {
    return here.drop(`formula can't be read (${(e as Error).message})`);
  }
  return clean({ name, formula, adds: firstText([p.adds], 40) });
}
