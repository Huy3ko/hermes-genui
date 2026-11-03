// Where a walk through a flow has got to: what every box holds, which boxes this pass has reached, the lit box and
// each repeated group's layer. Worked out from the flow and the steps up to the one shown, so Back and a jump to any
// dot land in the same state as stepping there.
import type { FlowMove } from "../steps/read";
import type { Chip, FlowGroup, FlowNode } from "./read";

export type FlowState = {
  /** What each box holds, by position. */
  holds: Chip[][];
  /** The boxes this pass has reached (the rest are dimmed), or null when the walk only lights boxes. */
  seen: ReadonlySet<number> | null;
  /** The lit box's position. */
  lit?: number;
  /** Each group's layer: 0 before the pass reaches it, then 1 up to its count. */
  layers: number[];
};

/**
 * The state at step `at`. Each step lights its node and adds it to the boxes reached; its holds replace those boxes'
 * chips from then on; reaching a group counts layer 1 and a tick adds to it. A step back on the first box starts a new
 * pass: only it is reached again and the counters rest (what the boxes hold stays).
 *   nodes tok, emb, attn, ffn (attn-ffn repeated × 6); steps [tok, emb (send), attn, ffn (tick 5)]
 *   at 2 → seen {tok, emb, attn}, lit attn, layers [1];  at 3 → layers [6]
 */
export function flowState(nodes: FlowNode[], groups: FlowGroup[], steps: readonly FlowMove[], at: number): FlowState {
  const holds = nodes.map((n) => n.holds ?? []);
  const place = (id: string | undefined) => (id === undefined ? -1 : nodes.findIndex((n) => n.id === id));
  const moving = isMoving(nodes, steps);
  let seen = new Set<number>();
  let layers = groups.map(() => 0);
  let lit: number | undefined;
  for (const step of steps.slice(0, at + 1)) {
    const i = place(step.node);
    if (i === 0 && seen.size) {
      seen = new Set();
      layers = groups.map(() => 0);
    }
    if (i >= 0) seen.add(i);
    for (const [id, chips] of Object.entries(step.holds ?? {})) {
      const k = place(id);
      if (k >= 0) holds[k] = chips;
    }
    const g = groups.findIndex((gr) => i >= gr.from && i <= gr.to);
    if (g >= 0) {
      const most = groups[g].count ?? Infinity;
      layers[g] = Math.min(most, Math.max(1, layers[g]) + (step.tick ?? 0));
    }
    lit = i >= 0 ? i : undefined;
  }
  return { holds, seen: moving && steps.length ? seen : null, lit, layers };
}

/** Whether a walk changes the flow (chips, packets, ticks) rather than only lighting boxes: only then are the boxes
 *  ahead dimmed, so a board that just lights boxes draws as it always has. */
export function isMoving(nodes: readonly FlowNode[], steps: readonly FlowMove[]): boolean {
  return nodes.some((n) => n.holds) || steps.some((s) => s.holds || s.send || s.tick);
}
