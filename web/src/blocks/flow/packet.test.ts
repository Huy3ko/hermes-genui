import { describe, expect, it } from "vitest";
import { packetPath } from "./packet";

const box = (l: number, t: number) => ({ left: l, top: t, right: l + 80, bottom: t + 40 });

describe("packetPath", () => {
  it("runs straight along the arrow to the next box, across or down", () => {
    expect(packetPath(box(0, 0), box(100, 0), false)).toEqual([{ x: 80, y: 20 }, { x: 100, y: 20 }]);
    expect(packetPath(box(0, 0), box(0, 60), false)).toEqual([{ x: 40, y: 40 }, { x: 40, y: 60 }]);
  });

  it("arcs over the boxes going back across, and round their right side going back up", () => {
    const over = packetPath(box(200, 0), box(0, 0), true);
    expect(over[0]).toEqual({ x: 240, y: 0 });
    expect(over.at(-1)).toEqual({ x: 40, y: 0 });
    expect(Math.min(...over.map((p) => p.y))).toBeLessThan(-10);
    const round = packetPath(box(0, 120), box(0, 0), true);
    expect(round[0]).toEqual({ x: 80, y: 140 });
    expect(round.at(-1)).toEqual({ x: 80, y: 20 });
    expect(Math.max(...round.map((p) => p.x))).toBeGreaterThan(90);
  });
});
