// For each, a good input, a sloppy one written the way models write, and a broken one that is dropped with a
// note saying why.
import { describe, expect, it } from "vitest";
import { readBlocksNoted } from "../../core/readBlocks";

const one = (block: unknown) => readBlocksNoted([block]);

describe("layers", () => {
  it("reads the slabs bottom first, with their tones and notes", () => {
    const r = one({ type: "layers", title: "The transformer stack", caption: "Simplified.", layers: [
      { id: "embed", label: "Embedding", tone: "blue", note: "Turns each token into a **vector**." },
      { id: "out", label: "Output", tone: "green" },
    ] });
    expect(r.blocks).toEqual([{ type: "layers", title: "The transformer stack", caption: "Simplified.", layers: [
      { label: "Embedding", tone: "blue", note: "Turns each token into a **vector**." },
      { label: "Output", tone: "green" },
    ] }]);
    expect(r.dropped).toEqual([]);
  });

  it("takes the names models guess, makes an unknown tone blue and drops slabs without a label", () => {
    const r = one({ type: "layers", levels: [{ title: "Crust", tone: "red", description: "Rock" }, { name: "Mantle" }, { note: "?" }] });
    expect((r.blocks[0] as any).layers).toEqual([{ label: "Crust", tone: "blue", note: "Rock" }, { label: "Mantle", tone: "blue" }]);
    expect(r.dropped).toEqual([{ path: "0.layers.2", why: "layer needs a label" }]);
  });

  it("drops a stack with fewer than 2 slabs, and keeps at most 12", () => {
    expect(one({ type: "layers", layers: [{ label: "Only" }] }).dropped).toEqual([{ path: "0", why: "layers needs at least 2 slabs" }]);
    const many = Array.from({ length: 14 }, (_, i) => ({ label: `L${i}` }));
    expect((one({ type: "layers", layers: many }).blocks[0] as any).layers.length).toBe(12);
  });
});
