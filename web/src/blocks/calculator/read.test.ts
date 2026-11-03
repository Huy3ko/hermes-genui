// For each, a good input, a sloppy one written the way models write, and a broken one that is dropped with a
// note saying why.
import { describe, expect, it } from "vitest";
import { readBlocksNoted } from "../../core/readBlocks";

const one = (block: unknown) => readBlocksNoted([block]);

describe("calculator", () => {
  const loan = { type: "calculator", title: "Home loan",
    inputs: [{ id: "p", label: "Loan", min: 1000000, max: 10000000, step: 100000, value: 4000000, unit: "₹" },
      { id: "r", label: "Rate", min: 6, max: 12, step: 0.1, value: 8.5, unit: "%" }],
    outputs: [{ label: "EMI", formula: "emi(p, r, 20)", unit: "₹" }] };
  it("reads inputs and outputs as written", () => {
    const r = one(loan);
    expect(r.blocks).toEqual([loan]);
    expect(r.dropped).toEqual([]);
  });
  it("takes sliders/results, name/title/default/expr aliases, and fills in min, max and step", () => {
    const r = one({ type: "calculator", sliders: [{ name: "p", title: "Loan", max: 10000000, default: 4000000, unit: "₹" }, { id: "tip", value: 12 }],
      results: [{ label: "EMI", expr: "emi(p, 8.5, 20)", unit: "₹" }] });
    expect(r.blocks[0]).toEqual({ type: "calculator",
      inputs: [{ id: "p", label: "Loan", min: 0, max: 10000000, step: 100000, value: 4000000, unit: "₹" },
        { id: "tip", label: "tip", min: 0, max: 24, step: 0.2, value: 12 }],
      outputs: [{ label: "EMI", formula: "emi(p, 8.5, 20)", unit: "₹" }] });
  });
  it("keeps a value inside its range", () => {
    expect((one({ type: "calculator", inputs: [{ id: "x", min: 0, max: 10, value: 50 }] }).blocks[0] as any).inputs[0].value).toBe(10);
  });
  it("drops bad inputs and outputs with notes; keeps an unreadable formula (it shows –) with a note", () => {
    const r = one({ type: "calculator",
      inputs: [{ id: "p", value: 5 }, { id: "p", value: 6 }, { id: "emi", value: 1 }, { id: "a.b", value: 1 }, { id: "x", min: 5, max: 5 }, "nope"],
      outputs: [{ label: "Half", formula: "p / 2" }, { label: "Bad", formula: "p.constructor" }, { label: "Ghost", formula: "q * 2" }, { label: "Empty" }] });
    expect((r.blocks[0] as any).inputs.map((x: any) => x.id)).toEqual(["p"]);
    expect((r.blocks[0] as any).outputs.map((x: any) => x.label)).toEqual(["Half", "Bad", "Ghost"]);
    expect(r.dropped).toEqual([
      { path: "0.inputs.1", why: 'input id "p" is used twice' },
      { path: "0.inputs.2", why: 'input needs an id like "p" or "rate" (got "emi")' },
      { path: "0.inputs.3", why: 'input needs an id like "p" or "rate" (got "a.b")' },
      { path: "0.inputs.4", why: "input's max must be above its min" },
      { path: "0.inputs.5", why: "input is not an object" },
      { path: "0.outputs.1", why: 'formula can\'t be read (can\'t read ".constructor"); shows –' },
      { path: "0.outputs.2", why: "formula uses q, which no input has; shows –" },
      { path: "0.outputs.3", why: "output needs a label and a formula" },
    ]);
  });
  it("drops a calculator with no usable input", () => {
    expect(one({ type: "calculator", outputs: [{ label: "Two", formula: "1 + 1" }] }).dropped).toEqual([
      { path: "0", why: "calculator has no usable input" }]);
  });
});
