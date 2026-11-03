// For each, a good input, a sloppy one written the way models write, and a broken one that is dropped with a
// note saying why.
import { describe, expect, it } from "vitest";
import { readBlocksNoted } from "../../core/readBlocks";

const one = (block: unknown) => readBlocksNoted([block]);

describe("tiles", () => {
  it("reads cards, leaving off an unsafe image or an unknown icon", () => {
    const r = one({ type: "tiles", items: [
      { title: "Kyoto", subtitle: "Temples", image: "https://x.example/k.jpg", icon: "walk", ask: "Plan Kyoto" },
      { title: "Nara", image: "javascript:x", icon: "nope", run: "Plan Nara" }] });
    expect(r.dropped).toEqual([]);
    expect(r.blocks).toEqual([{ type: "tiles", items: [
      { title: "Kyoto", subtitle: "Temples", image: "https://x.example/k.jpg", icon: "walk", ask: "Plan Kyoto" },
      { title: "Nara", run: "Plan Nara" }] }]);
  });
  it("takes label/value/note when there is no title or subtitle", () => {
    const r = one({ type: "tiles", tiles: [{ label: "Right now", value: "24°C", note: "0 mm rain", ask: "Weather?" }] });
    expect((r.blocks[0] as any).items).toEqual([{ title: "Right now", subtitle: "24°C · 0 mm rain", ask: "Weather?" }]);
  });
  it("drops tiles without a title, and keeps at most 8", () => {
    const r = one({ type: "tiles", items: [{ subtitle: "no title" }] });
    expect(r.blocks).toEqual([]);
    expect(r.dropped).toEqual([{ path: "0.items.0", why: "tile has no title" }, { path: "0", why: "tiles has no item with a title" }]);
    const many = one({ type: "tiles", items: Array.from({ length: 10 }, (_, i) => ({ title: `t${i}`, ask: "x" })) });
    expect((many.blocks[0] as any).items.length).toBe(8);
  });
});
