import { describe, expect, it } from "vitest";
import { readBlocks } from "../../core/readBlocks";

describe("source", () => {
  it("drops non-http links but keeps the text", () => {
    const b = readBlocks([{ type: "source", text: "x", url: "javascript:alert(1)" }]);
    expect(b[0]).toEqual({ type: "source", text: "x" });
  });
  it("joins a list of named sources", () => {
    const b = readBlocks([{ type: "source", sources: [{ name: "ixigo", url: "https://www.ixigo.com/x" }, { name: "Wikipedia" }] }]);
    expect(b[0]).toEqual({ type: "source", text: "ixigo · Wikipedia", url: "https://www.ixigo.com/x" });
  });
});
