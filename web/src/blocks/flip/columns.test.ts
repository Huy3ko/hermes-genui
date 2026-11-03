import { describe, expect, it } from "vitest";
import { flipColumns } from "./columns";

describe("flipColumns", () => {
  it("puts up to 4 cards in one row", () => {
    expect([1, 2, 3, 4].map(flipColumns)).toEqual([1, 2, 3, 4]);
  });
  it("picks 3 or 4 columns so the last row is as full as it can be", () => {
    expect(flipColumns(5)).toBe(3);   // 3 + 2, not 4 + 1
    expect(flipColumns(6)).toBe(3);   // 3 + 3, not 4 + 2
    expect(flipColumns(7)).toBe(4);   // 4 + 3
    expect(flipColumns(8)).toBe(4);
    expect(flipColumns(9)).toBe(3);
    expect(flipColumns(10)).toBe(4);  // 4 + 4 + 2, not 3 + 3 + 3 + 1
    expect(flipColumns(12)).toBe(4);
  });
});
