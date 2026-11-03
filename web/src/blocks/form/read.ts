// form: a small form the user fills in and sends; the answers go back to the model as one plain message.
import { niceStep } from "../calculator/read";
import { clean, firstList, firstText, firstTextOrNumber, keepFirst, num, type Trail } from "../../core/fields";

/** note: a short line under the option ("Beach, long lunches"). */
export type FormOption = { value: string; label: string; note?: string };
/** group: a heading shared by this field and the ones after it with the same group. */
type FieldBase = { id: string; label: string; group?: string; required: boolean };
export type ChoiceField = FieldBase & { kind: "select" | "radio"; options: FormOption[]; value?: string };
export type CheckboxField = FieldBase & { kind: "checkbox"; options: FormOption[]; value: string[] };
export type TextField = FieldBase & { kind: "text"; placeholder?: string; multiline: boolean; value?: string };
/** ends: the words under the slider's left and right ends, ["Shoestring", "Splurge"]. */
export type SliderField = FieldBase & { kind: "slider"; min: number; max: number; step: number; value: number; unit?: string; ends?: [string, string] };
export type FormField = ChoiceField | CheckboxField | TextField | SliderField;
/** path: where the form sits in the stored board ("0", "1.children.2"): its sent state is saved under that key. */
export type FormBlock = { type: "form"; id: string; title?: string; submit: string; fields: FormField[]; path: string };

const MAX_FIELDS = 12;
const MAX_OPTIONS = 60;
const LABEL = 100;  // models write labels as questions: "Anything to slip in? (a pet's name, a toy)"
const OPTION = 80;
// The most an option's note, a group heading, a slider's end word and a placeholder may hold (as in blocks/form.py).
const NOTE = 80;
const GROUP = 40;
const END = 20;
const PLACEHOLDER = 60;
export const TEXT_VALUE = 500;
const KINDS = ["select", "radio", "checkbox", "text", "slider"] as const;
// A field's id is a key in the answers (a plain object), so it is a short plain word, and never one of the names every
// object already has. The Python checker (blocks/form.py) applies the same rule.
const FIELD_ID = /^[A-Za-z_][\w-]{0,39}$/;
const RESERVED_IDS = ["__proto__", "constructor", "prototype"];
type Kind = (typeof KINDS)[number];
// The names models also write for a kind, and what they mean.
const KIND_NAMES: Record<string, Kind> = {
  select: "select", dropdown: "select", radio: "radio", choice: "radio",
  checkbox: "checkbox", checkboxes: "checkbox", multi: "checkbox", multiselect: "checkbox",
  text: "text", input: "text", textarea: "text", slider: "slider", range: "slider",
};

/**
 * form: id (missing: from the title, else "form-1"), title, submit (the button's words, default "Send") and fields, up
 * to 12: {id, kind (also `type`), label, value (the model's best guess), group (a heading shared by the fields after
 * it; also `section`), required}. Kinds: select (also `dropdown`), radio, checkbox (also `checkboxes`; value is a
 * list), text (also `textarea`, which is multiline; placeholder, also `hint`), slider (also `range`). select, radio
 * and checkbox take options, up to 60: text, or {value, label, note (also `description`)}. A slider takes min, max,
 * step, unit and ends [left word, right word].
 *   {type: "form", title: "Plan it", fields: [{id: "where", type: "dropdown", label: "Where", value: "Hills", options: ["Hills", "Beach"]}]}
 *   → {type: "form", id: "plan-it", title: "Plan it", submit: "Send", path: "0",
 *      fields: [{id: "where", kind: "select", label: "Where", required: false, value: "Hills",
 *                options: [{value: "Hills", label: "Hills"}, {value: "Beach", label: "Beach"}]}]}
 * Dropped: a field with an unknown kind, no id or a repeated id (each with a note); the whole form when none is left.
 */
export function readForm(raw: any, here: Trail): FormBlock | null {
  const rawFields = firstList([raw.fields, raw.inputs, raw.questions]);
  if (!rawFields) return here.drop("form needs fields");
  const fields: FormField[] = [];
  rawFields.forEach((item, i) => {
    const where = here.at("fields").at(i);
    const field = readField(item, where);
    if (!field) return;
    if (fields.some((f) => f.id === field.id)) {
      where.drop(`field id "${field.id}" is used twice`);
      return;
    }
    fields.push(field);
  });
  if (!fields.length) return here.drop("form has no usable field");
  const title = firstText([raw.title, raw.label], 80);
  const id = formIdFrom(firstText([raw.id, raw.name], 60), title);
  const submit = firstText([raw.submit, raw.button], 24) ?? "Send";
  return clean({ type: "form" as const, id, title, submit, fields: keepFirst(fields, MAX_FIELDS, here, "fields"), path: here.path });
}

/** The form's id: the model's own, else its title as a slug, else "form-1".
 *  ("trip", "Plan the weekend") → "trip";  (none, "Plan the weekend!") → "plan-the-weekend";  (none, none) → "form-1" */
export function formIdFrom(id: string | undefined, title: string | undefined): string {
  if (id) return id;
  const slug = (title ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  return slug || "form-1";
}

/** A label of at most `max` characters: whole when it fits, else cut at the last word that fits, with "…" (a single
 *  long word is cut where it must). "Length" → "Length";  a 120-character question → its first ~99 characters up to a word, "…" */
export function shortLabel(text: string, max = LABEL): string {
  if (text.length <= max) return text;
  const room = text.slice(0, max - 1);
  const lastSpace = room.lastIndexOf(" ");
  const atWord = lastSpace > max / 2 ? room.slice(0, lastSpace) : room;
  return `${atWord.trimEnd()}…`;
}

/** One field; null (with a note) when its kind is unknown, it has no id, or it can't be used.
 *  {kind: "dropdown", id: "who", options: ["Me", "Us"]} → a select field;  {kind: "date", id: "d"} → null, noted;
 *  {kind: "radio", id: "x", options: []} → null, "radio needs options";
 *  {kind: "text", id: "two words"} → null, 'field id must be a word like "where" …';  id "__proto__" → null, reserved */
function readField(item: any, here: Trail): FormField | null {
  if (!item || typeof item !== "object") return here.drop("field is not an object");
  const named = String(item.kind ?? item.type ?? "").trim().toLowerCase();
  const kind = KIND_NAMES[named];
  if (!kind) return here.drop(`field kind "${named}" isn't one of ${KINDS.join(", ")}`);
  const id = firstText([item.id, item.name, item.key], 200);
  if (!id) return here.drop("field needs an id");
  if (!FIELD_ID.test(id)) return here.drop('field id must be a word like "where" (letters, digits, _ or -)');
  if (RESERVED_IDS.includes(id)) return here.drop(`field id "${id}" is reserved`);
  const whole = firstText([item.label, item.title], 400);
  const group = firstText([item.group, item.section], GROUP);
  const base: FieldBase = clean({ id, label: whole ? shortLabel(whole) : id, group, required: item.required === true });
  if (kind === "text") return readTextField(item, named, base);
  if (kind === "slider") return readSlider(item, base, here);
  const options = readOptions(firstList([item.options, item.choices]) ?? [], here);
  if (!options.length) return here.drop(`${kind} needs options`);
  const values = options.map((o) => o.value);
  if (kind === "checkbox") {
    const ticked = prefilledList(item.value).map((v) => String(v)).filter((v) => values.includes(v));
    return { ...base, kind, options, value: [...new Set(ticked)] };
  }
  const given = firstTextOrNumber([item.value, item.default]);
  const value = given !== undefined && values.includes(given) ? given : undefined;  // not an option: nothing preselected
  return clean({ ...base, kind, options, value });
}

/** A checkbox field's prefilled value as a list: ["Music"] → ["Music"]; "Music" → ["Music"]; undefined → [] */
function prefilledList(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value === undefined) return [];
  return [value];
}

/** The options of a select, radio or checkbox: text (or a number), or {value, label, note}; the first of a repeated
 *  value is kept, and at most 60.  ["1 min", {value: "3", label: "3 min", note: "a story"}, "1 min"]
 *  → [{value: "1 min", label: "1 min"}, {value: "3", label: "3 min", note: "a story"}] */
function readOptions(list: unknown[], here: Trail): FormOption[] {
  const options: FormOption[] = [];
  for (const o of list as any[]) {
    const isObject = !!o && typeof o === "object";
    const value = isObject ? firstTextOrNumber([o.value, o.id, o.label], OPTION) : firstTextOrNumber([o], OPTION);
    if (value === undefined || options.some((x) => x.value === value)) continue;
    const label = (isObject ? firstText([o.label, o.name], OPTION) : undefined) ?? value;
    const note = isObject ? firstText([o.note, o.description], NOTE) : undefined;
    options.push(clean({ value, label, note }));
  }
  return keepFirst(options, MAX_OPTIONS, here, "options");
}

/** A text field; `textarea` (or multiline: true) is a box of several lines. */
function readTextField(item: any, named: string, base: FieldBase): TextField {
  const placeholder = firstText([item.placeholder, item.hint], PLACEHOLDER);
  const multiline = item.multiline === true || named === "textarea";
  const value = firstText([item.value, item.default], TEXT_VALUE);
  return clean({ ...base, kind: "text" as const, placeholder, multiline, value });
}

/** A slider; null (with a note) when its min isn't below its max. Its value is kept in range and put on its step.
 *  {min: 0, max: 100, step: 10, value: 43} → value 40;  {min: 5, max: 5} → null;  no step, 0 to 1 → a step of 0.01 */
function readSlider(item: any, base: FieldBase, here: Trail): SliderField | null {
  const min = num(item.min) ?? 0;
  const max = num(item.max) ?? 100;
  if (min >= max) return here.drop("slider needs min below max");
  const given = num(item.step);
  const step = given !== null && given > 0 ? given : niceStep((max - min) / 100);
  const value = onStep(num(item.value) ?? num(item.default) ?? min, min, max, step);
  return clean({ ...base, kind: "slider" as const, min, max, step, value, unit: firstText([item.unit], 12), ends: readEnds(item.ends) });
}

/** The words under a slider's two ends: two texts, each cut to 20 characters; else none.
 *  ["Shoestring", "Splurge"] → the same;  ["slow"] → undefined;  ["slow", 5] → undefined */
function readEnds(v: unknown): [string, string] | undefined {
  if (!Array.isArray(v) || v.length !== 2) return undefined;
  const left = firstText([v[0]], END);
  const right = firstText([v[1]], END);
  return left && right ? [left, right] : undefined;
}

/** A slider value kept between min and max and moved to the nearest step from min, without float dust.
 *  (43, 0, 100, 10) → 40;  (7, 0, 1, 0.1) → 1;  (12.34, 10, 20, 0.5) → 12.5 */
export function onStep(value: number, min: number, max: number, step: number): number {
  const inRange = Math.min(max, Math.max(min, value));
  const snapped = Math.min(max, min + Math.round((inRange - min) / step) * step);
  return Number(snapped.toFixed(Math.max(decimals(step), decimals(min))));
}

/** How many digits a number has after its point: 0.25 → 2; 10 → 0 */
function decimals(n: number): number {
  const text = String(n);
  const dot = text.indexOf(".");
  return dot === -1 ? 0 : text.length - dot - 1;
}
