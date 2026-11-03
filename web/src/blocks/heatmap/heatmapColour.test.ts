import { describe, expect, it } from "vitest";
import { cellColour, cellText, rangeOf } from "./heatmapColour";

const range = { low: -10, high: 10 };

describe("a heatmap cell's colour and text", () => {
  it("finds the range, skipping blanks", () => {
    expect(rangeOf([[4, -1], [null, 7]])).toEqual({ low: -1, high: 7 });
    expect(rangeOf([[null]])).toEqual({ low: 0, high: 0 });
  });
  it("shades losses warm and gains green, deeper the bigger, on a diverging scale", () => {
    expect(cellColour(-10, range, "diverging")).toBe("color-mix(in srgb, var(--hb-warn) 70%, transparent)");
    expect(cellColour(10, range, "diverging")).toBe("color-mix(in srgb, var(--hb-good) 70%, transparent)");
    expect(cellColour(5, range, "diverging")).toBe("color-mix(in srgb, var(--hb-good) 40%, transparent)");
    expect(cellColour(0, range, "diverging")).toBe("color-mix(in srgb, var(--hb-good) 10%, transparent)");
    expect(cellColour(null, range, "diverging")).toBe("var(--hb-well)");
  });
  it("shades the accent light to dark on a sequential scale", () => {
    expect(cellColour(-10, range, "sequential")).toBe("color-mix(in srgb, var(--hb-accent) 10%, transparent)");
    expect(cellColour(10, range, "sequential")).toBe("color-mix(in srgb, var(--hb-accent) 70%, transparent)");
    expect(cellColour(3, { low: 3, high: 3 }, "sequential")).toBe("color-mix(in srgb, var(--hb-accent) 70%, transparent)");
  });
  it("prints a number short, with its unit", () => {
    expect(cellText(4.125, "%")).toBe("4.1%");
    expect(cellText(7)).toBe("7");
    expect(cellText(2.5, "h")).toBe("2.5 h");
    expect(cellText(null, "%")).toBe("–");
  });
});
