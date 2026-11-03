// What a form's saved "sent" state is read back as.
import { describe, expect, it } from "vitest";
import { readBlocks } from "../../core/readBlocks";
import type { FormBlock } from "./read";
import { readSent, sentRecord } from "./sentForm";

const form = readBlocks([{ type: "form", id: "trip", fields: [
  { id: "where", kind: "select", label: "Where", value: "Hills", options: ["Hills", "Beach"] },
  { id: "add", kind: "checkbox", label: "Add", options: ["Music", "Food stops"] },
  { id: "spend", kind: "slider", label: "Budget", min: 5, max: 30, step: 1, value: 12 },
  { id: "who", kind: "text", label: "Who" },
] }])[0] as FormBlock;

describe("sent form state", () => {
  it("records the answers sent", () => {
    expect(sentRecord({ where: "Beach", who: "Asha" })).toEqual({ sent: true, values: { where: "Beach", who: "Asha" } });
  });
  it("reads back the answers that fit the form, and the starting values for the rest", () => {
    const saved = { sent: true, values: { where: "Beach", add: ["Food stops", "Music", "Food stops"], spend: 20, who: "Asha" } };
    expect(readSent(saved, form)).toEqual({ where: "Beach", add: ["Music", "Food stops"], spend: 20, who: "Asha" });
  });
  it("ignores saved answers that don't fit: an unknown option, a slider out of range, text too long, odd keys", () => {
    const values = JSON.parse('{"where": "Mars", "add": "Music", "spend": 99, "who": 5, "__proto__": {"x": 1}, "extra": "y"}');
    expect(readSent({ sent: true, values }, form)).toEqual({ where: "Hills", add: [], spend: 30, who: "" });
    expect(readSent({ sent: true, values: { who: "x".repeat(600) } }, form)!.who).toBe("");
    expect(readSent({ sent: true }, form)).toEqual({ where: "Hills", add: [], spend: 12, who: "" });
  });
  it("is null when nothing usable says the form was sent", () => {
    for (const saved of [undefined, null, "sent", [1], {}, { sent: "yes" }, { values: { who: "A" } }]) {
      expect(readSent(saved, form)).toBeNull();
    }
  });
});
