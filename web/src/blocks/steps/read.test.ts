// For each, a good input, a sloppy one written the way models write, and a broken one that is dropped with a
// note saying why.
import { describe, expect, it } from "vitest";
import { readBlocksNoted } from "../../core/readBlocks";

const one = (block: unknown) => readBlocksNoted([block]);

describe("steps", () => {
  it("reads the steps in order, with the flow they point at and an https photo", () => {
    const r = one({ type: "steps", title: "Step by step", for: "tf", items: [
      { title: "Split the text", text: "Into **tokens**.", node: "tokens", image: "https://x.example/t.jpg" },
      { title: "Attend", node: "attn" },
    ] });
    expect(r.blocks).toEqual([{ type: "steps", title: "Step by step", for: "tf", items: [
      { title: "Split the text", text: "Into **tokens**.", node: "tokens", image: "https://x.example/t.jpg" },
      { title: "Attend", node: "attn" },
    ] }]);
    expect(r.dropped).toEqual([]);
  });

  it("takes the names models guess and drops what can't be used", () => {
    const r = one({ type: "steps", flow: "tf", steps: [
      { label: "First", body: "Start here", node: "Not A Slug", image: "http://x.example/a.jpg" },
      { text: "no title" },
      { title: "Second", description: "Then this" },
      "junk",
    ] });
    expect(r.blocks).toEqual([{ type: "steps", for: "tf", items: [
      { title: "First", text: "Start here" },
      { title: "Second", text: "Then this" },
    ] }]);
    expect(r.dropped).toEqual([
      { path: "0.items.1", why: "step needs a title" },
      { path: "0.items.3", why: "step needs a title" },
    ]);
  });

  it("drops steps with no titled item, ignores a bad flow id, and keeps at most 12", () => {
    expect(one({ type: "steps", items: [{ text: "x" }] }).blocks).toEqual([]);
    expect((one({ type: "steps", for: "<b>", items: [{ title: "A" }, { title: "B" }] }).blocks[0] as any).for).toBeUndefined();
    const many = Array.from({ length: 14 }, (_, i) => ({ title: `s${i}` }));
    expect((one({ type: "steps", items: many }).blocks[0] as any).items.length).toBe(12);
  });

  it("reads how each step changes its flow, and drops changes it can't use", () => {
    const r = one({ type: "steps", for: "tf", items: [
      { title: "Embed", node: "emb", send: true, holds: { emb: ["[.2 …]", { text: "[.8 …]", tone: "accent" }], "Bad Key": ["x"], tok: "nope" } },
      { title: "Again", node: "ffn", tick: 5, send: "yes" },
      { title: "Odd", tick: 21, holds: ["a"] },
      { title: "Half", tick: 2.5 },
    ] });
    expect((r.blocks[0] as any).items).toEqual([
      { title: "Embed", node: "emb", send: true, holds: { emb: [{ text: "[.2 …]" }, { text: "[.8 …]", accent: true }] } },
      { title: "Again", node: "ffn", tick: 5 },
      { title: "Odd" },
      { title: "Half" },
    ]);
  });
});
