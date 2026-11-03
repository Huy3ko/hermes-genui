// For each, a good input, a sloppy one written the way models write, and a broken one that is dropped with a
// note saying why.
import { describe, expect, it } from "vitest";
import { readBlocksNoted } from "../../core/readBlocks";

const one = (block: unknown) => readBlocksNoted([block]);

describe("streak", () => {
  it("reads a count and up to 7 days, with defaults for label and unit", () => {
    const r = one({ type: "streak", count: 3,
      days: [{ label: "Mon", done: true }, { label: "Thu", date: "12", today: true }, ...Array.from({ length: 8 }, () => ({ label: "x" }))] });
    const s = r.blocks[0] as any;
    expect(s).toMatchObject({ type: "streak", count: 3, label: "Current streak", unit: "days" });
    expect(s.days.length).toBe(7);
    expect(s.days[0]).toEqual({ label: "Mon", done: true, today: false });
    expect(s.days[1]).toEqual({ label: "Thu", date: "12", done: false, today: true });
  });
  it("is dropped without a numeric count", () => {
    expect(one({ type: "streak", count: "three" }).dropped).toEqual([{ path: "0", why: "streak needs a numeric count" }]);
  });
});
