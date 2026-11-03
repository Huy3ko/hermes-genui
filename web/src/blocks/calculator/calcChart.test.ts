import { describe, expect, it } from "vitest";
import { readBlocksNoted } from "../../core/readBlocks";
import { calcChartSpec, MAX_POINTS, type CalcChart } from "./calcChart";
import { balance, interestPaid } from "../../lib/formula";

const inputs = [{ id: "p", value: 4000000, max: 10000000 }, { id: "r", min: 5, max: 12, value: 8.5 }, { id: "n", min: 5, max: 30, value: 20 }];
const values = new Map([["p", 4000000], ["r", 8.5], ["n", 20]]);
const loanChart = (over: Partial<CalcChart> = {}): CalcChart => ({
  kind: "line", title: "Loan", x: { name: "y", from: 0, to: "n", step: 1, label: "Year {y}" },
  series: [{ name: "Balance", formula: "balance(p, r, n, y)" }, { name: "Interest", formula: "interest_paid(p, r, n, y)" }],
  unit: "₹", ...over,
});
const readCalc = (chart: unknown) => readBlocksNoted([{ type: "calculator", inputs, outputs: [], chart }]);

describe("reading a calculator's chart", () => {
  it("keeps a good chart", () => {
    const r = readCalc({ kind: "area", title: "Loan", unit: "₹", x: { name: "y", from: 0, to: "n", step: 1, label: "Year {y}" },
      series: [{ name: "Balance", formula: "balance(p, r, n, y)" }] });
    expect(r.dropped).toEqual([]);
    expect((r.blocks[0] as any).chart).toEqual({ kind: "area", title: "Loan", unit: "₹",
      x: { name: "y", from: 0, to: "n", step: 1, label: "Year {y}" }, series: [{ name: "Balance", formula: "balance(p, r, n, y)" }] });
  });
  it("draws any other kind as a line, and fills in from 0 and step 1", () => {
    const r = readCalc({ kind: "pie", x: { name: "y", to: 10 }, series: [{ name: "B", formula: "y * 2" }] });
    expect((r.blocks[0] as any).chart).toEqual({ kind: "line", x: { name: "y", from: 0, to: 10, step: 1 }, series: [{ name: "B", formula: "y * 2" }] });
  });
  it("drops the chart (keeping the calculator) when x has no usable name or no end, or no series is usable", () => {
    const series = [{ name: "B", formula: "y" }];
    for (const [chart, why] of [
      [{ x: { name: "p", to: 5 }, series }, 'x name "p" is an input\'s id'],
      [{ x: { name: "emi", to: 5 }, series }, 'x name "emi" is a helper\'s name'],
      [{ x: { name: "a b", to: 5 }, series }, 'x needs a name like "y"'],
      [{ x: { name: "y" }, series }, "x needs from, to and step (numbers or formulas)"],
      [{ x: { name: "y", to: 5 }, series: [{ formula: "y" }] }, "chart has no usable series"],
    ] as const) {
      const r = readCalc(chart);
      expect(r.blocks.length).toBe(1);
      expect((r.blocks[0] as any).chart).toBeUndefined();
      expect(r.dropped.at(-1)).toEqual({ path: "0.chart", why });
    }
  });
  it("puts x's value in its label's one placeholder whatever it is named, and drops stray braces", () => {
    const labelled = (label: string) => (readCalc({ x: { name: "d", to: 5, label }, series: [{ name: "B", formula: "d" }] }).blocks[0] as any).chart.x.label;
    expect(labelled("Night {y}")).toBe("Night {d}");
    expect(labelled("Night {d}")).toBe("Night {d}");
    expect(labelled("Night {d} of {n}")).toBe("Night {d} of n");
    expect(labelled("{a} to {b}")).toBe("a to b");
    expect(labelled("Night {")).toBe("Night");
  });
  it("keeps at most 3 series and notes a formula using a name nothing has", () => {
    const r = readCalc({ x: { name: "y", to: 5 }, series: [1, 2, 3, 4].map((i) => ({ name: `S${i}`, formula: i === 2 ? "q * y" : "y" })) });
    expect((r.blocks[0] as any).chart.series.map((s: any) => s.name)).toEqual(["S1", "S2", "S3"]);
    expect(r.dropped).toEqual([
      { path: "0.chart.series.1", why: "formula uses q, which no input has; leaves gaps" },
      { path: "0.chart", why: "kept the first 3 series of 4" },
    ]);
  });
});

describe("the chart worked out from the sliders", () => {
  it("has a point per step, labelled from the template, with each series' values", () => {
    const spec = calcChartSpec(loanChart(), values)!;
    expect(spec.type).toBe("line");
    expect(spec.x.length).toBe(21);
    expect(spec.x[0]).toBe("Year 0");
    expect(spec.x[20]).toBe("Year 20");
    expect(spec.series[0].data[0]).toBe(4000000);
    expect(spec.series[0].data[10]).toBeCloseTo(balance(4000000, 8.5, 20, 10), 4);
    expect(spec.series[1].data[20]).toBeCloseTo(interestPaid(4000000, 8.5, 20, 20), 4);
    expect(spec.unit).toBe("₹");
  });
  it("follows the inputs: a new rate gives new values, a new term a new range", () => {
    const moved = calcChartSpec(loanChart(), new Map([["p", 4000000], ["r", 10], ["n", 15]]))!;
    expect(moved.x.length).toBe(16);
    expect(moved.series[0].data[5]).toBeCloseTo(balance(4000000, 10, 15, 5), 4);
  });
  it("labels with the number itself when there's no template", () => {
    const spec = calcChartSpec(loanChart({ x: { name: "y", from: 0, to: 1, step: 0.25 } }), values)!;
    expect(spec.x).toEqual(["0", "0.25", "0.5", "0.75", "1"]);
  });
  it(`never draws more than ${MAX_POINTS} points: the step grows to fit`, () => {
    const spec = calcChartSpec(loanChart({ x: { name: "y", from: 0, to: 1000, step: 1 } }), values)!;
    expect(spec.x.length).toBeLessThanOrEqual(MAX_POINTS);
    expect(spec.x.length).toBeGreaterThan(100);
    expect(spec.x[1]).toBe("6");   // every 6th year
  });
  it("leaves a gap where a series can't be worked out, and gives no chart when nothing can", () => {
    const gap = calcChartSpec(loanChart({ x: { name: "y", from: 0, to: 4, step: 1 }, series: [{ name: "Odd", formula: "1 / (y - 2)" }] }), values)!;
    expect(gap.series[0].data).toEqual([-0.5, -1, null, 1, 0.5]);
    expect(calcChartSpec(loanChart({ series: [{ name: "Bad", formula: "q * y" }] }), values)).toBeNull();
    expect(calcChartSpec(loanChart({ x: { name: "y", from: 0, to: "q", step: 1 } }), values)).toBeNull();
    expect(calcChartSpec(loanChart({ x: { name: "y", from: 5, to: 1, step: 1 } }), values)).toBeNull();
    expect(calcChartSpec(loanChart({ x: { name: "y", from: 0, to: 5, step: 0 } }), values)).toBeNull();
  });
});

describe("area charts in a calculator", () => {
  it("draw several series as separate lines, never as a stack", () => {
    const chart = { ...loanChart(), kind: "area" as const };
    const spec = calcChartSpec(chart, new Map([["p", 4000000], ["r", 8.5], ["n", 20]]))!;
    expect(spec.type).toBe(chart.series.length > 1 ? "line" : "area");
  });
});

describe("a chart's work is bounded", () => {
  it("works out a full chart of 200 points × 3 loan series, but gaps the rest once its budget is spent", () => {
    const x = { name: "y", from: 0, to: 199, step: 1 };
    const typical = calcChartSpec(loanChart({ x, series: [{ name: "A", formula: "prepay_years(p, r, 100, y)" },
      { name: "B", formula: "balance(p, r, n, y)" }, { name: "C", formula: "interest_paid(p, r, n, y)" }] }), values)!;
    expect(typical.series.every((s) => s.data.every((v) => v !== null))).toBe(true);
    const heavy = "prepay_years(p, r, 100, y) + prepay_years(p, r, 100, y) + prepay_years(p, r, 100, y) + prepay_years(p, r, 100, y)";
    const spec = calcChartSpec(loanChart({ x, series: [1, 2, 3].map((i) => ({ name: `S${i}`, formula: heavy })) }), values)!;
    expect(spec.series[0].data[0]).not.toBeNull();
    expect(spec.series[2].data.at(-1)).toBeNull();
  });
});
