import { clean, firstList, firstText, icon, keepFirst, num, slug, str, textOrNumber, type Trail } from "../../core/fields";
import type { IconName } from "../../lib/icons";

/** One chip in a box: what the box holds ("The", "[.2 −1.1 …]"); `accent` picks one out. */
export type Chip = { text: string; accent?: true };
export type FlowNode = { id?: string; label: string; icon?: IconName; note?: string; holds?: Chip[] };
/** A labelled frame round the nodes from `from` to `to` (positions in nodes, both included), repeated `count` times. */
export type FlowGroup = { label: string; from: number; to: number; count?: number };
export type FlowBlock = {
  type: "flow"; id?: string; title?: string; direction: "right" | "down"; nodes: FlowNode[]; groups?: FlowGroup[];
};

const MAX_NODES = 10;
const MAX_GROUPS = 3;
const MAX_CHIPS = 10;
const CHIP = 16;
const NO_RUN = "group needs a label and a run of node ids next to each other";

/**
 * flow: boxes joined by arrows, in node order. Each node needs a label (also `title`/`name`); its note (also
 * `text`/`description`) opens under the diagram on a tap. Nodes may also come as `stages`. `id` (a short lowercase
 * slug) lets a steps block light a node; a bad or repeated node id is left out, so that node just can't be lit.
 * direction: "down", else right (the drawing turns a right flow down when the column is too narrow).
 * groups: [{label, nodes: ids}] become frames round a run of neighbouring nodes, in order, that no other group holds;
 * count (2-100) is how many times the group repeats. holds: up to 10 chips per node (readChips).
 *   {type: "flow", id: "tf", nodes: [{id: "tok", label: "Tokens"}, {id: "attn", label: "Attention"}, {id: "out", label: "Next"}],
 *    groups: [{label: "× 12", nodes: ["attn", "out"]}]}
 *   → {type: "flow", id: "tf", direction: "right", nodes: [...the same three], groups: [{label: "× 12", from: 1, to: 2}]}
 * Dropped: a node without a label; a group that isn't a labelled run, or shares a node; the whole flow when fewer
 * than 2 nodes are left; nodes past the 10th and groups past the 3rd.
 */
export function readFlow(raw: any, here: Trail): FlowBlock | null {
  const list = firstList([raw.nodes, raw.stages]) ?? [];
  const nodes: FlowNode[] = [];
  const seen = new Set<string>();
  list.forEach((n: any, i: number) => {
    const label = firstText([n?.label, n?.title, n?.name], 40);
    if (!label) {
      here.at("nodes").at(i).drop("node needs a label");
      return;
    }
    let id = slug(n.id);
    if (id !== undefined && seen.has(id)) id = undefined;
    if (id !== undefined) seen.add(id);
    const holds = readChips(n.holds, here.at("nodes").at(i).at("holds"));
    nodes.push(clean({ id, label, icon: icon(n.icon), note: firstText([n.note, n.text, n.description], 280), holds }));
  });
  if (nodes.length < 2) return here.drop("flow needs at least 2 nodes");
  const kept = keepFirst(nodes, MAX_NODES, here, "nodes");
  const groups = readGroups(raw.groups, kept, here);
  return clean({
    type: "flow" as const, id: slug(raw.id), title: str(raw.title, 80), direction: raw.direction === "down" ? "down" as const : "right" as const,
    nodes: kept, groups: groups.length ? groups : undefined,
  });
}

/** The groups as runs of node positions.  nodes tok, attn, out: {label: "× 12", nodes: ["attn", "out"]} → {from: 1, to: 2};
 *  ["tok", "out"] (a gap) or ["out", "attn"] (out of order) → dropped with a note. */
function readGroups(rawGroups: unknown, nodes: FlowNode[], here: Trail): FlowGroup[] {
  if (!Array.isArray(rawGroups)) return [];
  const groups: FlowGroup[] = [];
  const taken = new Set<number>();
  rawGroups.forEach((g: any, j: number) => {
    const at = here.at("groups").at(j);
    const label = str(g?.label, 40);
    const ids: unknown[] = Array.isArray(g?.nodes) ? g.nodes : [];
    const spots = ids.map((id) => nodes.findIndex((n) => n.id !== undefined && n.id === id));
    const from = spots[0];
    const isRun = spots.length > 0 && spots.every((p, k) => p >= 0 && p === from + k);
    if (!label || !isRun) {
      at.drop(NO_RUN);
      return;
    }
    if (spots.some((p) => taken.has(p))) {
      at.drop("groups can't share nodes");
      return;
    }
    spots.forEach((p) => taken.add(p));
    const count = num(g.count);
    const counted = count !== null && Number.isInteger(count) && count >= 2 && count <= 100 ? count : undefined;
    if (g.count !== undefined && counted === undefined) at.drop("count is a whole number from 2 to 100; left out");
    groups.push(clean({ label, from, to: spots[spots.length - 1], count: counted }));
  });
  return keepFirst(groups, MAX_GROUPS, here, "groups");
}

/**
 * What a box holds: up to 10 chips, each text or a number cut to 16 characters, or {text, tone: "accent"} to pick it
 * out; anything else is left out. Not a list → undefined.
 *   ["The", {text: "it", tone: "accent"}, 5, null] → [{text: "The"}, {text: "it", accent: true}, {text: "5"}]
 */
export function readChips(raw: unknown, here: Trail): Chip[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const chips: Chip[] = [];
  for (const c of raw) {
    const text = textOrNumber(c && typeof c === "object" ? (c as any).text : c, CHIP);
    if (text !== undefined) chips.push(clean({ text, accent: (c as any)?.tone === "accent" ? true as const : undefined }));
  }
  return keepFirst(chips, MAX_CHIPS, here, "chips");
}
