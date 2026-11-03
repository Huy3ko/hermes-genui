// For each, a good input, a sloppy one written the way models write, and a broken one that is dropped with a
// note saying why.
import { describe, expect, it } from "vitest";
import { readBlocksNoted } from "../../core/readBlocks";
import { scaleOf } from "./read";

const one = (block: unknown) => readBlocksNoted([block]);

describe("heatmap", () => {
  it("pairs row labels with value rows, drops short rows, reads non-numbers as blanks, infers the scale", () => {
    const r = one({ type: "heatmap", title: "Finance", rows: ["JPM", "GS", "MS"], cols: ["Q1", "Q2"],
      values: [[4.1, -1.2], [7.5], [1.4, "n/a", 9]], unit: "%" });
    expect(r.blocks).toEqual([{ type: "heatmap", title: "Finance", rows: ["JPM", "MS"], cols: ["Q1", "Q2"],
      values: [[4.1, -1.2], [1.4, null]], unit: "%", scale: "diverging" }]);
    expect(r.dropped).toEqual([{ path: "0.values.1", why: 'row "GS" has 1 values, the heatmap has 2 columns' }]);
  });
  it("drops a heatmap without rows, cols or values", () => {
    expect(one({ type: "heatmap", rows: ["a"], cols: [], values: [[1]] }).blocks).toEqual([]);
    expect(one({ type: "heatmap", rows: ["a"], cols: ["x"], values: [[]] }).blocks).toEqual([]);
  });
  it("takes the scale the model asks for, else diverging only when a value is negative", () => {
    expect(scaleOf("sequential", [[-1, 2]])).toBe("sequential");
    expect(scaleOf(undefined, [[-1, 2]])).toBe("diverging");
    expect(scaleOf(undefined, [[1, 2]])).toBe("sequential");
    expect(scaleOf("rainbow", [[1, null]])).toBe("sequential");
  });
});
