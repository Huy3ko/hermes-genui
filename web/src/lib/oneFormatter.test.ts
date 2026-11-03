/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";

// Every source file (tests excluded) as text, keyed by its path relative to this folder.
const sources = import.meta.glob(["../**/*.{ts,tsx}", "!../**/*.test.{ts,tsx}"], { query: "?raw", import: "default", eager: true }) as Record<string, string>;

describe("one number formatter", () => {
  it("formats numbers only in lib/format.ts", () => {
    const offenders = Object.entries(sources)
      .filter(([path, text]) => path !== "./format.ts" && /toLocaleString\(|Intl\.NumberFormat/.test(text))
      .map(([path]) => path);
    expect(Object.keys(sources).length).toBeGreaterThan(20);
    expect(offenders).toEqual([]);
  });
});
