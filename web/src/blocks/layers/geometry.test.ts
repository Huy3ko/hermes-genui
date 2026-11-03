import { describe, expect, it } from "vitest";
import { inside, rotate, slabAt, stackShapes } from "./geometry";

describe("layers geometry", () => {
  it("turns a point about the upright axis and tips it towards the viewer", () => {
    expect(rotate([1, 2, 3], 0, 0)).toEqual({ x: 1, y: 2, depth: 3 });
    const turned = rotate([1, 0, 0], Math.PI / 2, 0);
    expect(turned.x).toBeCloseTo(0);
    expect(turned.depth).toBeCloseTo(-1);
  });

  it("stacks the slabs bottom first, the open one slid towards the viewer with room round it", () => {
    const shut = stackShapes(3, [0, 0, 0], 0.5, 0.5, 600, 400);
    const opened = stackShapes(3, [0, 1, 0], 0.5, 0.5, 600, 400);
    expect(shut.length).toBe(3);
    // higher slabs sit higher on screen (smaller y)
    expect(shut[2].label.y).toBeLessThan(shut[0].label.y);
    // an open slab comes towards the viewer, so its label sits lower than when shut
    expect(opened[1].label.y).toBeGreaterThan(shut[1].label.y - 1);
    expect(opened[1].faces.length).toBeGreaterThanOrEqual(3);
  });

  it("finds the topmost slab under a point, or none", () => {
    const shapes = stackShapes(3, [1, 0, 0], 0.5, 0.5, 600, 400);
    const roof = shapes[2].faces.at(-1)!.corners;
    const middle = { x: roof.reduce((a, p) => a + p.x, 0) / 4, y: roof.reduce((a, p) => a + p.y, 0) / 4 };
    expect(inside(roof, middle.x, middle.y)).toBe(true);
    expect(slabAt(shapes, middle.x, middle.y)).toBe(2);
    expect(slabAt(shapes, 1, 1)).toBeNull();
  });
});
