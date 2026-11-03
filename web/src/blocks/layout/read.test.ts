import { describe, expect, it } from "vitest";
import { readBlocksNoted } from "../../core/readBlocks";

const text = (t: string) => ({ type: "text", text: t });
const stat = (label: string) => ({ type: "stat", label, value: 1 });
const chart = { type: "chart", kind: "line", x: ["a", "b"], series: [{ data: [1, 2] }] };

describe("containers", () => {
  it("draws a section holding a chart and a callout", () => {
    const r = readBlocksNoted([{ type: "section", title: "NIFTY", children: [chart, { type: "callout", tone: "tip", text: "Up on banks." }] }]);
    expect(r.dropped).toEqual([]);
    expect((r.blocks[0] as any).children.map((b: any) => b.type)).toEqual(["chart", "callout"]);
    expect((r.blocks[0] as any).collapsed).toBe(false);
  });
  it("gives a collapsed section without a title one to tap", () => {
    const r = readBlocksNoted([{ type: "section", collapsed: true, items: [text("x")] }]);
    expect(r.blocks).toEqual([{ type: "section", title: "Details", collapsed: true, children: [{ type: "text", text: "x" }] }]);
  });
  it("keeps a row or grid one level down, and flattens anything deeper", () => {
    const r = readBlocksNoted([{ type: "section", title: "S", children: [
      { type: "row", children: [stat("a"), { type: "grid", children: [stat("b"), stat("c")] }] },
      { type: "grid", children: [stat("d"), stat("e")] }] }]);
    const section = r.blocks[0] as any;
    expect(section.children.map((b: any) => b.type)).toEqual(["row", "grid"]);
    expect(section.children[0].children.map((b: any) => b.label)).toEqual(["a", "b", "c"]);
    expect(r.dropped).toEqual([{ path: "0.children.0.children.1", why: "grid nested too deep; drawn in place" }]);
  });
  it("flattens a section inside a section into a heading and its children", () => {
    const r = readBlocksNoted([{ type: "section", children: [text("a"), { type: "section", title: "More", children: [text("b")] }] }]);
    expect((r.blocks[0] as any).children).toEqual([{ type: "text", text: "a" }, { type: "heading", text: "More" }, { type: "text", text: "b" }]);
  });
  it("draws a row holding a wide block as a plain stack", () => {
    const r = readBlocksNoted([{ type: "row", children: [stat("a"), chart] }]);
    expect(r.blocks.map((b) => b.type)).toEqual(["stat", "chart"]);
    expect(r.dropped[0].why).toBe("a chart can't sit in a row; drawn as a stack");
  });
  it("drops an empty container, and one whose children are all broken", () => {
    const r = readBlocksNoted([{ type: "grid", children: [] }, { type: "row", children: [{ type: "text" }] }]);
    expect(r.blocks).toEqual([]);
    expect(r.dropped).toEqual([
      { path: "0", why: "grid has no children it can draw" },
      { path: "1.children.0", why: "text needs text" },
      { path: "1", why: "row has no children it can draw" },
    ]);
  });
  it("draws a one-child container as that child; at most 3 in a row and 6 in a grid", () => {
    expect(readBlocksNoted([{ type: "row", children: [text("solo")] }]).blocks).toEqual([{ type: "text", text: "solo" }]);
    const row = readBlocksNoted([{ type: "row", children: [stat("1"), stat("2"), stat("3"), stat("4")] }]);
    expect((row.blocks[0] as any).children.length).toBe(3);
    const grid = readBlocksNoted([{ type: "grid", children: Array.from({ length: 8 }, (_, i) => stat(`s${i}`)) }]);
    expect((grid.blocks[0] as any).children.length).toBe(6);
    expect(grid.dropped).toEqual([{ path: "0", why: "kept the first 6 children of 8" }]);
  });
});

describe("columns", () => {
  const chart = { type: "chart", kind: "line", x: ["a", "b"], series: [{ data: [1, 2] }] };
  const table = { type: "table", columns: ["A"], rows: [["x"]] };
  it("holds wide blocks side by side, at most 3", () => {
    const r = readBlocksNoted([{ type: "columns", children: [chart, table, chart, table] }]);
    expect(r.blocks.map((b) => b.type)).toEqual(["columns"]);
    expect((r.blocks[0] as any).children.map((b: any) => b.type)).toEqual(["chart", "table", "chart"]);
    expect(r.dropped).toEqual([{ path: "0", why: "kept the first 3 children of 4" }]);
  });
  it("is just its child when it has one, and is drawn in place inside another container", () => {
    expect(readBlocksNoted([{ type: "columns", children: [table] }]).blocks.map((b) => b.type)).toEqual(["table"]);
    const nested = readBlocksNoted([{ type: "section", title: "S", children: [{ type: "columns", children: [chart, table] }] }]);
    expect((nested.blocks[0] as any).children.map((b: any) => b.type)).toEqual(["chart", "table"]);
  });
});

describe("the newer blocks in containers", () => {
  it("stacks a row holding a wide block (a list, heatmap, flip, progress or streak)", () => {
    const wide = [
      { type: "list", items: ["a"] },
      { type: "heatmap", rows: ["r"], cols: ["c"], values: [[1]] },
      { type: "flip", cards: [{ front: "q", back: "a" }] },
      { type: "progress", title: "p", value: 1, goal: 2 },
      { type: "streak", count: 1 },
    ];
    for (const block of wide) {
      const r = readBlocksNoted([{ type: "row", children: [stat("a"), block] }]);
      expect(r.blocks.map((b) => b.type)).toEqual(["stat", block.type]);
    }
  });
  it("keeps badges, bars, links and images side by side in a row", () => {
    const r = readBlocksNoted([{ type: "row", children: [
      { type: "badge", text: "New" }, { type: "bar", label: "Packed", value: 6, max: 9 }, { type: "link", url: "https://a.example" }] }]);
    expect(r.blocks.map((b) => b.type)).toEqual(["row"]);
    const g = readBlocksNoted([{ type: "grid", children: [{ type: "image", url: "https://a.example/x.jpg" }, { type: "bar", label: "x", value: 1 }] }]);
    expect(g.blocks.map((b) => b.type)).toEqual(["grid"]);
  });
});
