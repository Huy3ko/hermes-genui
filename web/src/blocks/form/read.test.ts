// For each, a good input, a sloppy one written the way models write, and a broken one that is dropped with a
// note saying why.
import { describe, expect, it } from "vitest";
import { readBlocksNoted } from "../../core/readBlocks";
import { formIdFrom, onStep, shortLabel } from "./read";

const one = (block: unknown) => readBlocksNoted([block]);

describe("form", () => {
  it("reads every field kind, with the model's values prefilled", () => {
    const r = one({ type: "form", id: "trip", title: "Weekend", fields: [
      { id: "where", kind: "select", label: "Where", value: "Hills", options: [{ value: "hills-1", label: "Hills" }, "Beach"] },
      { id: "pace", kind: "radio", label: "Pace", value: "Easy", options: ["Easy", "Packed"] },
      { id: "add", kind: "checkbox", label: "Add", value: ["Music"], options: ["Music", "Food stops"] },
      { id: "spend", kind: "slider", label: "Budget", min: 5, max: 30, step: 1, value: 12, unit: "k" },
      { id: "notes", kind: "text", label: "Notes", placeholder: "e.g. no early starts", required: true },
    ] });
    expect(r.dropped).toEqual([]);
    expect(r.blocks).toEqual([{ type: "form", id: "trip", title: "Weekend", submit: "Send", fields: [
      { id: "where", kind: "select", label: "Where", required: false,
        options: [{ value: "hills-1", label: "Hills" }, { value: "Beach", label: "Beach" }] },
      { id: "pace", kind: "radio", label: "Pace", required: false, value: "Easy",
        options: [{ value: "Easy", label: "Easy" }, { value: "Packed", label: "Packed" }] },
      { id: "add", kind: "checkbox", label: "Add", required: false, value: ["Music"],
        options: [{ value: "Music", label: "Music" }, { value: "Food stops", label: "Food stops" }] },
      { id: "spend", kind: "slider", label: "Budget", required: false, min: 5, max: 30, step: 1, value: 12, unit: "k" },
      { id: "notes", kind: "text", label: "Notes", required: true, placeholder: "e.g. no early starts", multiline: false },
    ], path: "0" }]);
  });
  it("takes the names models also use: type for kind, dropdown, checkboxes, textarea, range", () => {
    const r = one({ type: "form", title: "Quick", fields: [
      { id: "a", type: "dropdown", label: "A", options: ["x", "y"] },
      { id: "b", kind: "checkboxes", label: "B", options: ["x"], value: "x" },
      { id: "c", kind: "textarea", label: "C" },
      { id: "d", kind: "range", label: "D", min: 1, max: 5 },
    ] });
    const fields = (r.blocks[0] as any).fields;
    expect(fields.map((f: any) => [f.kind, f.multiline ?? null])).toEqual([["select", null], ["checkbox", null], ["text", true], ["slider", null]]);
    expect(fields[1].value).toEqual(["x"]);
  });
  it("ignores a prefilled value that isn't one of the options", () => {
    const fields = (one({ type: "form", id: "f", fields: [
      { id: "s", kind: "select", label: "S", value: "nope", options: ["a", "b"] },
      { id: "c", kind: "checkbox", label: "C", value: ["a", "nope"], options: ["a", "b"] },
    ] }).blocks[0] as any).fields;
    expect(fields[0].value).toBeUndefined();
    expect(fields[1].value).toEqual(["a"]);
  });
  it("keeps a slider's value in range and on its step; drops one whose min isn't below its max", () => {
    const r = one({ type: "form", id: "f", fields: [
      { id: "a", kind: "slider", label: "A", min: 0, max: 100, step: 10, value: 43 },
      { id: "b", kind: "slider", label: "B", min: 0, max: 1, step: 0.1, value: 7 },
      { id: "c", kind: "slider", label: "C", min: 5, max: 5 },
    ] });
    expect((r.blocks[0] as any).fields.map((f: any) => [f.id, f.value])).toEqual([["a", 40], ["b", 1]]);
    expect(r.dropped).toEqual([{ path: "0.fields.2", why: "slider needs min below max" }]);
    expect(onStep(12.34, 10, 20, 0.5)).toBe(12.5);
  });
  it("drops a field with an unknown kind, no id or a repeated id, and the form with none left", () => {
    const r = one({ type: "form", id: "f", fields: [
      { id: "a", kind: "date", label: "When" }, { kind: "text", label: "No id" }, { id: "b", kind: "text", label: "B" },
      { id: "b", kind: "text", label: "B again" }, { id: "c", kind: "radio", label: "C", options: [] },
    ] });
    expect((r.blocks[0] as any).fields.map((f: any) => f.id)).toEqual(["b"]);
    expect(r.dropped).toEqual([
      { path: "0.fields.0", why: 'field kind "date" isn\'t one of select, radio, checkbox, text, slider' },
      { path: "0.fields.1", why: "field needs an id" },
      { path: "0.fields.3", why: 'field id "b" is used twice' },
      { path: "0.fields.4", why: "radio needs options" },
    ]);
    expect(one({ type: "form", id: "f", fields: [{ id: "a", kind: "date" }] }).blocks).toEqual([]);
  });
  it("keeps 12 fields, and cuts a long label at a word", () => {
    const many = Array.from({ length: 15 }, (_, i) => ({ id: `f${i}`, kind: "text", label: `Field ${i}` }));
    expect((one({ type: "form", id: "f", fields: many }).blocks[0] as any).fields.length).toBe(12);
    const long = "What should the story be about, who is in it, where does it happen, and how should it end for her tonight?";
    expect(shortLabel(long)).toBe("What should the story be about, who is in it, where does it happen, and how should it end for her…");
  });
  it("names a form from its title when it has no id, else form-1", () => {
    expect(formIdFrom(undefined, "Plan the weekend!")).toBe("plan-the-weekend");
    expect(formIdFrom("trip", "Plan the weekend")).toBe("trip");
    expect(formIdFrom(undefined, undefined)).toBe("form-1");
  });
});

describe("form extras", () => {
  it("reads option notes, group headings, slider ends and text extras", () => {
    const r = one({ type: "form", id: "goa", fields: [
      { id: "pace", kind: "radio", label: "Pace", group: "Your style", value: "easy", options: [
        { value: "easy", label: "Easy", note: "Beach, long lunches" }, { value: "full", label: "Full", description: "Forts and markets" }, "Lazy"] },
      { id: "spend", kind: "slider", label: "Budget", group: "Your style", min: 5, max: 60, ends: ["Shoestring", "Splurge"] },
      { id: "notes", kind: "textarea", label: "Anything else?", hint: "e.g. no early starts" },
    ] });
    expect(r.dropped).toEqual([]);
    const [pace, spend, notes] = (r.blocks[0] as any).fields;
    expect(pace.group).toBe("Your style");
    expect(pace.options).toEqual([
      { value: "easy", label: "Easy", note: "Beach, long lunches" }, { value: "full", label: "Full", note: "Forts and markets" },
      { value: "Lazy", label: "Lazy" }]);
    expect(spend).toMatchObject({ group: "Your style", ends: ["Shoestring", "Splurge"] });
    expect(notes).toMatchObject({ multiline: true, placeholder: "e.g. no early starts" });
    expect(notes.group).toBeUndefined();
  });
  it("cuts each extra to its limit, and ignores ends that aren't two texts", () => {
    const fields = (one({ type: "form", id: "f", fields: [
      { id: "a", kind: "radio", group: "g".repeat(50), options: [{ value: "x", note: "n".repeat(90) }] },
      { id: "b", kind: "slider", ends: ["s".repeat(30), "q"] },
      { id: "c", kind: "slider", ends: ["slow"] },
      { id: "d", kind: "slider", ends: ["slow", 5] },
      { id: "e", kind: "text", placeholder: "p".repeat(70) },
    ] }).blocks[0] as any).fields;
    expect(fields[0].group).toBe("g".repeat(40));
    expect(fields[0].options[0].note).toBe("n".repeat(80));
    expect(fields[1].ends).toEqual(["s".repeat(20), "q"]);
    expect(fields[2].ends).toBeUndefined();
    expect(fields[3].ends).toBeUndefined();
    expect(fields[4].placeholder).toBe("p".repeat(60));
  });
  it("knows where it sits in the board, so its sent state can be saved", () => {
    const r = readBlocksNoted([{ type: "text", text: "Hi" }, { type: "section", title: "Ask", children: [
      { type: "form", id: "f", fields: [{ id: "a", kind: "text" }] }] }]);
    expect(((r.blocks[1] as any).children[0]).path).toBe("1.children.0");
  });
});

describe("form field ids", () => {
  it.each(["__proto__", "constructor", "prototype", "two words", "1st", "a.b", "x".repeat(41)])("drops the id %j with a note", (id) => {
    const fine = ["where", "_x", "trip-2", "A_b", "x".repeat(40)];
    const r = one({ type: "form", id: "f", fields: [{ id, kind: "text", label: "Bad" }, ...fine.map((f) => ({ id: f, kind: "text" }))] });
    expect((r.blocks[0] as any).fields.map((f: any) => f.id)).toEqual(fine);
    expect(r.dropped).toEqual([{ path: "0.fields.0", why: expect.stringMatching(/^field id /) }]);
  });
});
