// What a form becomes when the user presses Send: one plain message the model reads like anything the user types.
//   Form: Weekend (trip)
//   — The basics —
//   Where: Beach
//   Add: Music, Food stops
//   Notes: (none)
import type { FormBlock, FormField } from "./read";
import { formatWithUnit } from "../../lib/format";

export type FormValue = string | string[] | number | null;
export type FormValues = Record<string, FormValue>;

/** The values a form starts with: the model's prefilled guesses, else blank (null for a dropdown or radio nobody has
 *  picked, [] for checkboxes, "" for text, the slider's own value). */
export function startingValues(form: FormBlock): FormValues {
  const values: FormValues = {};
  for (const f of form.fields) {
    if (f.kind === "checkbox") values[f.id] = [...f.value];
    else if (f.kind === "slider") values[f.id] = f.value;
    else if (f.kind === "text") values[f.id] = f.value ?? "";
    else values[f.id] = f.value ?? null;
  }
  return values;
}

/** Whether a field has an answer: "Asha" → yes; "  " → no; null → no; [] → no; ["Music"] → yes; 40 → yes */
export function hasValue(value: FormValue | undefined): boolean {
  if (typeof value === "number") return true;
  if (Array.isArray(value)) return value.length > 0;
  return typeof value === "string" && value.trim() !== "";
}

/** Whether Send may be pressed: not sent yet, and every required field has an answer.
 *  a required name left blank → no;  all filled → yes;  already sent → no */
export function canSend(form: FormBlock, values: FormValues, sent: boolean): boolean {
  if (sent) return false;
  return form.fields.every((f) => !f.required || hasValue(values[f.id]));
}

/** A field's answer as words, "" when blank: an option's label for its value, ticked boxes joined by ", ", a slider
 *  with its unit, text as typed (its lines joined by " / ", so the answer stays on one line).
 *  radio "t" with option {value: "t", label: "Thin"} → "Thin";  checkbox ["Music", "Food stops"] → "Music, Food stops";
 *  slider 12 with unit "k" → "12 k";  text "Asha\nRavi" → "Asha / Ravi";  text "  " → "" */
export function answerWords(field: FormField, value: FormValue | undefined): string {
  if (!hasValue(value ?? null)) return "";
  if (field.kind === "slider") return formatWithUnit(value as number, field.unit);
  if (field.kind === "text") return String(value).trim().split(/\s*\n\s*/).join(" / ");
  const labelOf = (v: string) => field.options.find((o) => o.value === v)?.label ?? v;
  if (field.kind === "checkbox") return (value as string[]).map(labelOf).join(", ");
  return labelOf(String(value));
}

/** Whether field i starts a new group heading: it has a group, and the field before it has a different one (or none).
 *  [Dates (The basics), Travellers (The basics), Pace (Your style), Notes]: at 0 → yes, 1 → no, 2 → yes, 3 → no */
export function startsGroup(fields: FormField[], i: number): boolean {
  const group = fields[i].group;
  if (!group) return false;
  return fields[i - 1]?.group !== group;
}

/** The message Send sends: "Form: <title> (<id>)" so the model can tell which form answered ("Form: <id>" when it has
 *  no title), then "<label>: <answer>" per field in order, "(none)" for a blank one, and "— <group> —" before the
 *  first field of each group.
 *  Weekend (id trip) with Where = Hills and empty Notes → "Form: Weekend (trip)\nWhere: Hills\nNotes: (none)"
 *  with Where in group "The basics" → "Form: Weekend (trip)\n— The basics —\nWhere: Hills\nNotes: (none)" */
export function answerMessage(form: FormBlock, values: FormValues): string {
  const lines = [form.title ? `Form: ${form.title} (${form.id})` : `Form: ${form.id}`];
  form.fields.forEach((f, i) => {
    if (startsGroup(form.fields, i)) lines.push(`— ${f.group} —`);
    lines.push(`${f.label}: ${answerWords(f, values[f.id]) || "(none)"}`);
  });
  return lines.join("\n");
}
