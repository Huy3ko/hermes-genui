import { describe, expect, it } from "vitest";
import { readBlocks } from "../../core/readBlocks";

describe("images", () => {
  it("keeps https photos only, up to 12", () => {
    const photos = [{ url: "http://x.example/a.jpg" }, ...Array.from({ length: 14 }, (_, i) => ({ url: `https://x.example/${i}.jpg`, caption: `c${i}`, source: "Wikimedia" }))];
    const b = readBlocks([{ type: "images", title: "Lisbon", images: photos }])[0] as any;
    expect(b.title).toBe("Lisbon");
    expect(b.images.length).toBe(12);
    expect(b.images[0]).toEqual({ url: "https://x.example/0.jpg", caption: "c0", source: "Wikimedia" });
  });
  it("is dropped when no photo has an https url", () => {
    expect(readBlocks([{ type: "images", images: [{ url: "http://x.example/a.jpg" }] }])).toEqual([]);
  });
});
