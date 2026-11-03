import { describe, expect, it } from "vitest";
import { readBlocks } from "../../core/readBlocks";

describe("timeline", () => {
  it("reads groups and drops stops without a title and empty groups", () => {
    const b = readBlocks([{ type: "timeline", title: "Kyoto, 3 days", groups: [
      { label: "Day 1 · Fri 9 Oct", items: [{ time: "09:00", title: "Fushimi Inari", place: "Fushimi", icon: "walk", note: "Go early" }, { note: "no title" }] },
      { label: "empty", items: [] },
    ] }]);
    const t = b[0] as any;
    expect(t.groups.length).toBe(1);
    expect(t.groups[0].items).toEqual([{ time: "09:00", title: "Fushimi Inari", place: "Fushimi", icon: "walk", note: "Go early" }]);
  });
  it("reads a flat list of events as one unlabelled group", () => {
    const t = readBlocks([{ type: "timeline", title: "Day 1", events: [{ time: "09:00", title: "Check in", text: "Settle in" }] }])[0] as any;
    expect(t.groups).toEqual([{ label: "", items: [{ time: "09:00", title: "Check in", note: "Settle in" }] }]);
  });
  it("turns a long time with no title into the title", () => {
    const t = readBlocks([{ type: "timeline", events: [{ time: "Day 1: Nature & Lakes", description: "Gardens, then the lake" }] }])[0] as any;
    expect(t.groups[0].items[0]).toEqual({ title: "Day 1: Nature & Lakes", note: "Gardens, then the lake" });
  });
  it("drops unknown icon names", () => {
    const t = readBlocks([{ type: "timeline", events: [{ title: "Fly", icon: "aeroplane" }] }])[0] as any;
    expect(t.groups[0].items[0]).toEqual({ title: "Fly" });
  });
});
