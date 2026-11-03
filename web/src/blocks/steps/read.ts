import { clean, firstList, firstText, https, keepFirst, num, slug, str, type Trail } from "../../core/fields";
import { readChips, type Chip } from "../flow/read";

/** How a step moves its flow on: what boxes hold from now on (node id → chips), a packet sent from the box lit before,
 *  and how many more times the repeated group runs. */
export type FlowMove = { node?: string; holds?: Record<string, Chip[]>; send?: true; tick?: number };
export type Step = FlowMove & { title: string; text?: string; image?: string };
export type StepsBlock = { type: "steps"; title?: string; for?: string; items: Step[] };

/**
 * steps: a walkthrough shown one step at a time. Each step needs a title (also `label`); text (also `body`/
 * `description`) is a short paragraph; image an https photo. `for` (also `flow`) names a flow on the same board and a
 * step's `node` the node it lights there; either is left out when it isn't a short lowercase slug, and a name no flow
 * has is simply never drawn. Steps may also come as `steps`. A step can also set `holds` ({node id: chips}, ids
 * that aren't slugs and values that aren't lists are left out), `send: true` and `tick` (a whole number 1-20).
 *   {type: "steps", for: "tf", items: [{title: "Split", text: "Into **tokens**.", node: "tok"}, {label: "Attend"}]}
 *   → {type: "steps", for: "tf", items: [{title: "Split", text: "Into **tokens**.", node: "tok"}, {title: "Attend"}]}
 * Dropped: a step without a title; the whole block when no step is left; steps past the 12th.
 */
export function readSteps(raw: any, here: Trail): StepsBlock | null {
  const list = firstList([raw.items, raw.steps]) ?? [];
  const items: Step[] = [];
  list.forEach((s: any, i: number) => {
    const title = firstText([s?.title, s?.label], 80);
    if (!title) {
      here.at("items").at(i).drop("step needs a title");
      return;
    }
    const tick = num(s.tick);
    items.push(clean({
      title, text: firstText([s.text, s.body, s.description], 600), node: slug(s.node), image: https(s.image),
      holds: readHolds(s.holds, here.at("items").at(i).at("holds")), send: s.send === true ? true as const : undefined,
      tick: tick !== null && Number.isInteger(tick) && tick >= 1 && tick <= 20 ? tick : undefined,
    }));
  });
  if (!items.length) return here.drop("steps has no titled step");
  return clean({ type: "steps" as const, title: str(raw.title, 80), for: slug(raw.for) ?? slug(raw.flow), items: keepFirst(items, 12, here, "steps") });
}

/** A step's holds: {node id: chips}, at most 10 nodes. {emb: ["v"], "Bad Key": ["x"], tok: "no"} → {emb: [{text: "v"}]};
 *  not an object, or nothing usable → undefined */
function readHolds(raw: unknown, here: Trail): Record<string, Chip[]> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const holds: Record<string, Chip[]> = {};
  for (const [key, value] of Object.entries(raw).slice(0, 10)) {
    const id = slug(key);
    const chips = id === undefined ? undefined : readChips(value, here.at(id));
    if (id !== undefined && chips !== undefined) holds[id] = chips;
  }
  return Object.keys(holds).length ? holds : undefined;
}
