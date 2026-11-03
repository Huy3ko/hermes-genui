// For each, a good input, a sloppy one written the way models write, and a broken one that is dropped with a
// note saying why.
import { describe, expect, it } from "vitest";
import { readBlocksNoted } from "../../core/readBlocks";

const one = (block: unknown) => readBlocksNoted([block]);

describe("flip", () => {
  it("keeps cards with a front and a back, takes question/answer as aliases, drops the rest", () => {
    const r = one({ type: "flip", title: "Asian Games", cards: [
      { front: "Most golds?", back: "China · 201", image: "https://x.example/cn.jpg" },
      { question: "Host city?", answer: "Nagoya" },
      { front: "No answer" },
      { front: "Bad photo", back: "x", image: "http://x.example/a.jpg" },
    ] });
    expect(r.blocks).toEqual([{ type: "flip", title: "Asian Games", cards: [
      { front: "Most golds?", back: "China · 201", image: "https://x.example/cn.jpg" },
      { front: "Host city?", back: "Nagoya" },
      { front: "Bad photo", back: "x" },
    ] }]);
    expect(r.dropped).toEqual([{ path: "0.cards.2", why: "card needs a front and a back" }]);
  });
  it("keeps a front up to 140 characters and a back up to 260, cutting longer ones between words", () => {
    const words = (n: number) => Array.from({ length: n }, (_, i) => `word${i}`).join(" ");  // "word0 word1 …"
    const card = (one({ type: "flip", cards: [{ front: words(30), back: words(60) }] }).blocks[0] as any).cards[0];
    expect(card.front.length).toBeLessThanOrEqual(140);
    expect(card.front.length).toBeGreaterThan(120);
    expect(card.front).toMatch(/ word\d+…$/);
    expect(card.back.length).toBeLessThanOrEqual(260);
    expect(card.back.length).toBeGreaterThan(240);
    expect(card.back).toMatch(/ word\d+…$/);
    const fits = { front: "q".repeat(140), back: "a".repeat(260) };
    expect((one({ type: "flip", cards: [fits] }).blocks[0] as any).cards[0]).toEqual(fits);
  });
  it("drops a flip with no usable card, and keeps at most 12", () => {
    expect(one({ type: "flip", cards: [{ front: "only" }] }).blocks).toEqual([]);
    const many = Array.from({ length: 15 }, (_, i) => ({ front: `q${i}`, back: `a${i}` }));
    expect((one({ type: "flip", cards: many }).blocks[0] as any).cards.length).toBe(12);
  });
});
