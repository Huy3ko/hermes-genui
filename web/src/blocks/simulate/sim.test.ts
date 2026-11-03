import { describe, expect, it } from "vitest";
import { dotColour, dotPer, niceAbove, timesOf, whole } from "./sim";

describe("simulation maths", () => {
  it("rounds time down to a step and lists every step", () => {
    expect(whole(7.9, 1)).toBe(7);
    expect(whole(7.9, 0.5)).toBe(7.5);
    expect(timesOf(2, 0.5)).toEqual([0, 0.5, 1, 1.5, 2]);
  });

  it("picks round numbers at or above a value", () => {
    expect([0.3, 1, 1.2, 3, 7, 4300].map(niceAbove)).toEqual([0.5, 1, 2, 5, 10, 5000]);
  });

  it("keeps the model's amount per dot unless the piles would pass 600 dots, then picks a rounder one", () => {
    expect(dotPer(10000, 3_000_000)).toBe(10000);
    expect(dotPer(1000, 3_000_000)).toBe(5000);
    expect(dotPer(undefined, 3_000_000)).toBe(20000);
  });

  it("colours a dot by the band it falls in: the start, then what each pile before has, then its own extra", () => {
    // start 10 dots; piles of 40 and 70 dots
    expect([5, 25, 50].map((n) => dotColour(n, 10, [40, 70], 1))).toEqual([0, 1, 2]);
    expect([5, 25].map((n) => dotColour(n, 10, [40, 70], 0))).toEqual([0, 1]);
  });
});
