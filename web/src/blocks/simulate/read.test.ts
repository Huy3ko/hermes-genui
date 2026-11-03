// For each, a good input, a sloppy one written the way models write, and a broken one that is dropped with a
// note saying why.
import { describe, expect, it } from "vitest";
import { readBlocksNoted } from "../../core/readBlocks";

const one = (block: unknown) => readBlocksNoted([block]);
const SIM = {
  type: "simulate", title: "₹1,00,000 left alone for 30 years",
  t: { name: "years", to: 30, step: 1, unit: "years", speed: 1.25 },
  inputs: [{ name: "rate", label: "Interest per year", min: 6, max: 14, step: 0.5, value: 10, unit: "%" }],
  values: { P: 100000 },
  view: { kind: "dots", per: 10000, start: "₹1,00,000 you put in", piles: [
    { name: "Simple interest", formula: "P * (1 + rate / 100 * years)", adds: "interest" },
    { name: "Compound interest", formula: "P * (1 + rate / 100) ^ years", adds: "interest on interest" },
  ] },
  unit: "₹",
};

describe("simulate", () => {
  it("reads time, sliders, fixed values and piles; the run takes to ÷ speed seconds", () => {
    const r = one(SIM);
    expect(r.dropped).toEqual([]);
    expect(r.blocks).toEqual([{
      type: "simulate", title: "₹1,00,000 left alone for 30 years",
      t: { name: "years", to: 30, step: 1, unit: "years", seconds: 24 },
      inputs: [{ id: "rate", label: "Interest per year", min: 6, max: 14, step: 0.5, value: 10, unit: "%" }],
      values: [["P", 100000]], view: "dots", per: 10000, start: "₹1,00,000 you put in",
      piles: SIM.view.piles, unit: "₹",
    }]);
  });

  it("caps the run at 60 seconds, defaults it to 10, and keeps time to 1000 steps", () => {
    const slow = one({ ...SIM, t: { name: "years", to: 30, speed: 0.1 } }).blocks[0] as any;
    expect(slow.t).toEqual({ name: "years", to: 30, step: 1, seconds: 60 });
    expect((one({ ...SIM, t: { name: "years", to: 30 } }).blocks[0] as any).t.seconds).toBe(10);
    expect((one({ ...SIM, t: { name: "years", to: 5000, step: 1 } }).blocks[0] as any).t.step).toBe(5);
  });

  it("takes series for piles and a chart view, and drops piles it can't work out", () => {
    const r = one({ ...SIM, view: { kind: "chart", series: [
      { name: "Fine", formula: "P * years" },
      { name: "Ghost", formula: "P * q" },
      { name: "Broken", formula: "P *" },
      { formula: "P" },
    ] } });
    const sim = r.blocks[0] as any;
    expect(sim.view).toBe("chart");
    expect(sim.piles).toEqual([{ name: "Fine", formula: "P * years" }]);
    expect(r.dropped.map((d) => d.path)).toEqual(["0.view.piles.1", "0.view.piles.2", "0.view.piles.3"]);
  });

  it("drops names used twice or taken by helpers, and the block with no time or no pile", () => {
    const r = one({ ...SIM, values: { P: 100000, years: 5, max: 1, bad: "x" } });
    expect((r.blocks[0] as any).values).toEqual([["P", 100000]]);
    expect(r.dropped.length).toBe(3);
    const twice = one({ ...SIM, values: { P: 100000, rate: 5 } });
    expect((twice.blocks[0] as any).inputs).toEqual([]);  // the value came first, so the slider is the one left out
    expect(twice.dropped).toEqual([{ path: "0.inputs.0", why: 'name "rate" is used twice' }]);
    expect(one({ ...SIM, t: { name: "emi", to: 30 } }).dropped).toEqual([{ path: "0", why: 't needs a name (not a helper\'s) and to above 0' }]);
    expect(one({ ...SIM, view: { piles: [] } }).blocks).toEqual([]);
  });
});
