// The packet a step sends from one box to the next: the points it passes, worked out from where the two boxes are.

/** A box's edges in px, from the top left of the flow. */
export type Edges = { left: number; top: number; right: number; bottom: number };
export type Point = { x: number; y: number };

/**
 * The packet's path from box `a` to box `b`. Forwards it runs along the arrow: from a's right edge to b's left when
 * the boxes sit side by side, else from a's bottom to b's top. Backwards (to an earlier box, as a new pass starts) it
 * arcs over the boxes, or round their right side when the flow runs down.
 *   a 0-80 × 0-40, b 100-180 × 0-40, forwards → [{x: 80, y: 20}, {x: 100, y: 20}]
 */
export function packetPath(a: Edges, b: Edges, backward: boolean): Point[] {
  const across = b.left >= a.right - 1 || a.left >= b.right - 1;
  const middle = (e: Edges) => ({ x: (e.left + e.right) / 2, y: (e.top + e.bottom) / 2 });
  if (!backward) {
    return across
      ? [{ x: a.right, y: middle(a).y }, { x: b.left, y: middle(a).y }]
      : [{ x: middle(a).x, y: a.bottom }, { x: middle(b).x, y: b.top }];
  }
  if (across) {
    const start = { x: middle(a).x, y: a.top };
    const end = { x: middle(b).x, y: b.top };
    return arc(start, { x: (start.x + end.x) / 2, y: Math.min(a.top, b.top) - 40 }, end);
  }
  const start = { x: a.right, y: middle(a).y };
  const end = { x: b.right, y: middle(b).y };
  return arc(start, { x: Math.max(a.right, b.right) + 34, y: (start.y + end.y) / 2 }, end);
}

/** 17 points along the curve from a to b pulled towards `control`. */
function arc(a: Point, control: Point, b: Point, count = 16): Point[] {
  return Array.from({ length: count + 1 }, (_, k) => {
    const t = k / count;
    const u = 1 - t;
    return { x: u * u * a.x + 2 * u * t * control.x + t * t * b.x, y: u * u * a.y + 2 * u * t * control.y + t * t * b.y };
  });
}
