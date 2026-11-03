import { describe, expect, it } from "vitest";
import type { FlowMove } from "../steps/read";
import { flowState, isMoving } from "./walk";

const nodes = ["tok", "emb", "attn", "ffn", "out"].map((id) => ({ id, label: id, holds: [{ text: `${id}?` }] }));
const groups = [{ label: "Repeated", from: 2, to: 3, count: 6 }];
const steps = [
  { node: "tok" },
  { node: "emb", send: true as const, holds: { emb: [{ text: "[.2 …]" }] } },
  { node: "attn", send: true as const, holds: { attn: [{ text: "mixed" }] } },
  { node: "ffn", tick: 5 },
  { node: "out", send: true as const },
  { node: "tok", send: true as const, holds: { tok: [{ text: "The" }, { text: "tired", accent: true as const }] } },
] as FlowMove[];

describe("flowState", () => {
  it("starts with each box's own chips, only the first box reached and the counter at rest", () => {
    const s = flowState(nodes, groups, steps, 0);
    expect(s.holds.map((h) => h[0].text)).toEqual(["tok?", "emb?", "attn?", "ffn?", "out?"]);
    expect([...s.seen!]).toEqual([0]);
    expect(s.lit).toBe(0);
    expect(s.layers).toEqual([0]);
  });

  it("keeps what earlier steps put in the boxes, counts the layer once reached and ticks it on", () => {
    const s = flowState(nodes, groups, steps, 3);
    expect(s.holds[1]).toEqual([{ text: "[.2 …]" }]);
    expect(s.holds[2]).toEqual([{ text: "mixed" }]);
    expect([...s.seen!].sort()).toEqual([0, 1, 2, 3]);
    expect(s.layers).toEqual([6]);
    expect(flowState(nodes, groups, steps, 2).layers).toEqual([1]);
  });

  it("starts a new pass when a step goes back to the first box: only it is reached and the counter rests", () => {
    const s = flowState(nodes, groups, steps, 5);
    expect([...s.seen!]).toEqual([0]);
    expect(s.layers).toEqual([0]);
    expect(s.holds[0]).toEqual([{ text: "The" }, { text: "tired", accent: true }]);
    expect(s.holds[1]).toEqual([{ text: "[.2 …]" }]);  // what the boxes hold stays
  });

  it("never counts past the group's count, and ignores node ids the flow doesn't have", () => {
    expect(flowState(nodes, groups, [{ node: "attn", tick: 20 }], 0).layers).toEqual([6]);
    const s = flowState(nodes, groups, [{ node: "ghost", holds: { ghost: [{ text: "x" }] } }], 0);
    expect(s.lit).toBeUndefined();
    expect(s.holds.flat().map((c) => c.text)).not.toContain("x");
  });

  it("with no steps nothing is lit or dimmed, and moving walks are told apart from plain highlighting", () => {
    const s = flowState(nodes, groups, [], 0);
    expect(s.lit).toBeUndefined();
    expect(s.seen).toBeNull();
    expect(isMoving([{ label: "x" }], [{ node: "tok" }])).toBe(false);
    expect(isMoving([{ label: "x" }], [{ node: "tok", tick: 2 }])).toBe(true);
    expect(isMoving([{ label: "x", holds: [{ text: "a" }] }], [])).toBe(true);
  });
});
