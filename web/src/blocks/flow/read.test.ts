// For each, a good input, a sloppy one written the way models write, and a broken one that is dropped with a
// note saying why.
import { describe, expect, it } from "vitest";
import { readBlocksNoted } from "../../core/readBlocks";

const one = (block: unknown) => readBlocksNoted([block]);

describe("flow", () => {
  it("reads nodes in order, with their ids, icons and notes, and a group as a run of node positions", () => {
    const r = one({ type: "flow", id: "tf", title: "Next word", direction: "down", nodes: [
      { id: "tokens", label: "Tokens", icon: "note", note: "Text cut into **pieces**." },
      { id: "attn", label: "Attention", icon: "brain" },
      { id: "ffn", label: "Feed-forward" },
      { id: "next", label: "Next word" },
    ], groups: [{ label: "Repeated × 12 layers", nodes: ["attn", "ffn"] }] });
    expect(r.blocks).toEqual([{ type: "flow", id: "tf", title: "Next word", direction: "down", nodes: [
      { id: "tokens", label: "Tokens", icon: "note", note: "Text cut into **pieces**." },
      { id: "attn", label: "Attention", icon: "brain" },
      { id: "ffn", label: "Feed-forward" },
      { id: "next", label: "Next word" },
    ], groups: [{ label: "Repeated × 12 layers", from: 1, to: 2 }] }]);
    expect(r.dropped).toEqual([]);
  });

  it("takes the names models guess, flows right unless asked for down, and drops bad ids, icons and groups", () => {
    const r = one({ type: "flow", id: "Not A Slug", direction: "sideways", stages: [
      { id: "a", title: "First", description: "The start", icon: "rocket" },
      { name: "Second" },
      { id: "a", label: "Third, same id" },
      { id: "c", note: "no label" },
      "junk",
    ], groups: [
      { label: "Gap", nodes: ["a", "z"] },
      { nodes: ["a"] },
      { label: "Fine", nodes: ["a"] },
      { label: "Overlap", nodes: ["a"] },
    ] });
    expect(r.blocks).toEqual([{ type: "flow", direction: "right", nodes: [
      { id: "a", label: "First", note: "The start" },
      { label: "Second" },
      { label: "Third, same id" },
    ], groups: [{ label: "Fine", from: 0, to: 0 }] }]);
    expect(r.dropped).toEqual([
      { path: "0.nodes.3", why: "node needs a label" },
      { path: "0.nodes.4", why: "node needs a label" },
      { path: "0.groups.0", why: "group needs a label and a run of node ids next to each other" },
      { path: "0.groups.1", why: "group needs a label and a run of node ids next to each other" },
      { path: "0.groups.3", why: "groups can't share nodes" },
    ]);
  });

  it("drops a flow with fewer than 2 nodes, and keeps at most 10 nodes and 3 groups", () => {
    expect(one({ type: "flow", nodes: [{ label: "Only" }] }).dropped).toEqual([{ path: "0", why: "flow needs at least 2 nodes" }]);
    expect(one({ type: "flow" }).blocks).toEqual([]);
    const many = Array.from({ length: 12 }, (_, i) => ({ id: `n${i}`, label: `N${i}` }));
    const groups = [0, 2, 4, 6].map((k) => ({ label: `G${k}`, nodes: [`n${k}`] }));
    const r = one({ type: "flow", nodes: many, groups });
    expect((r.blocks[0] as any).nodes.length).toBe(10);
    expect((r.blocks[0] as any).groups.length).toBe(3);
  });

  it("caps text: a 30-char label stays, a long note is cut to 280", () => {
    const r = one({ type: "flow", nodes: [{ label: "A", note: "n".repeat(400) }, { label: "B" }] });
    expect((r.blocks[0] as any).nodes[0].note.length).toBe(280);
  });

  it("reads what each box holds and how many times a group repeats, keeping chips short", () => {
    const r = one({ type: "flow", nodes: [
      { id: "tok", label: "Tokens", holds: ["The", { text: "it", tone: "accent" }, 5, "x".repeat(20), null, { tone: "accent" }] },
      { id: "attn", label: "Attention", holds: "not a list" },
      { id: "ffn", label: "Feed-forward", holds: Array.from({ length: 12 }, (_, i) => `c${i}`) },
    ], groups: [{ label: "Repeated", nodes: ["attn"], count: 6 }, { label: "Odd", nodes: ["ffn"], count: 1 }] });
    const flow = r.blocks[0] as any;
    expect(flow.nodes[0].holds).toEqual([{ text: "The" }, { text: "it", accent: true }, { text: "5" }, { text: "x".repeat(16) }]);
    expect(flow.nodes[1].holds).toBeUndefined();
    expect(flow.nodes[2].holds.length).toBe(10);
    expect(flow.groups).toEqual([{ label: "Repeated", from: 1, to: 1, count: 6 }, { label: "Odd", from: 2, to: 2 }]);
    expect(r.dropped).toEqual([
      { path: "0.nodes.2.holds", why: "kept the first 10 chips of 12" },
      { path: "0.groups.1", why: "count is a whole number from 2 to 100; left out" },
    ]);
  });
});
