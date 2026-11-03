import { describe, expect, it } from "vitest";
import { cutAtWord, firstWords } from "./fields";

describe("cutAtWord", () => {
  it("leaves text that fits alone", () => {
    expect(cutAtWord("Host city?", 20)).toBe("Host city?");
    expect(cutAtWord("x".repeat(20), 20)).toBe("x".repeat(20));
  });
  it("cuts between words and ends in an ellipsis, within the limit", () => {
    const question = "Why do transformers need positional encoding if attention already sees everything?";
    const cut = cutAtWord(question, 60);
    expect(cut).toBe("Why do transformers need positional encoding if attention…");
    expect(cut.length).toBeLessThanOrEqual(60);
  });
  it("drops a comma or dash left at the cut", () => {
    expect(cutAtWord("Rome, Paris, London and Berlin", 14)).toBe("Rome, Paris…");
    expect(cutAtWord("Delhi – Agra – Jaipur", 9)).toBe("Delhi…");
  });
  it("cuts inside a word only when one long word fills most of the room", () => {
    expect(cutAtWord("See https://example.org/a/very/long/path", 20)).toBe("See https://example…");
  });
});

describe("firstWords", () => {
  it("takes the first field with text, trimmed, and cuts it between words", () => {
    expect(firstWords([undefined, "  Most golds?  "], 140)).toBe("Most golds?");
    expect(firstWords([" ", "one two three"], 10)).toBe("one two…");
    expect(firstWords([5, null], 10)).toBeUndefined();
  });
});
