// The stack in light 3D, by hand: each slab is a box turned about the upright axis (yaw), tipped towards the viewer
// (pitch) and dropped flat onto the canvas. No library; a few faces per slab, painted bottom slab first.

/** A slab's size, the gap between slabs, the room the open slab gets above and below, and how far it slides out. */
const SLAB = { width: 2.4, depth: 1.5, thick: 0.16, gap: 0.34, open: 0.5, pull: 0.6 };

export type Point = { x: number; y: number };
/** A face's corners on the canvas and how strongly it takes the slab's colour (sides darker, the top lighter). */
export type Face = { corners: Point[]; strength: number };
/** One slab: its faces (the top last) and where its label goes. */
export type SlabShape = { faces: Face[]; label: Point };

/**
 * A point turned about the upright axis by `yaw`, tipped by `pitch`, flattened: x right, y up, depth towards the
 * viewer.  ([1, 2, 3], 0, 0) → {x: 1, y: 2, depth: 3}
 */
export function rotate([x, y, z]: [number, number, number], yaw: number, pitch: number): { x: number; y: number; depth: number } {
  const x1 = x * Math.cos(yaw) + z * Math.sin(yaw);
  const z1 = -x * Math.sin(yaw) + z * Math.cos(yaw);
  return { x: x1, y: y * Math.cos(pitch) - z1 * Math.sin(pitch), depth: y * Math.sin(pitch) + z1 * Math.cos(pitch) };
}

/**
 * Every slab's faces on a canvas `width` × `height`, bottom slab first. `open[i]` (0 to 1) is how far slab i is pulled
 * out: it slides towards the viewer and the stack opens round it, so its top and label show. The stack sits left of
 * centre, leaving room for the labels on the right.
 */
export function stackShapes(n: number, open: number[], yaw: number, pitch: number, width: number, height: number): SlabShape[] {
  const tall = n * SLAB.thick + (n - 1) * SLAB.gap + SLAB.open;
  const reach = Math.hypot(SLAB.width, SLAB.depth + SLAB.pull);
  const scale = Math.min((width * 0.6) / reach, (height * 0.9) / (tall * Math.cos(pitch) + reach * Math.sin(pitch)));
  const cx = width * 0.36;
  const cy = height / 2;
  const screen = ([x, y, z]: [number, number, number]): Point => {
    const r = rotate([x, y - tall / 2, z], yaw, pitch);
    return { x: cx + r.x * scale, y: cy - r.y * scale };
  };
  const w = SLAB.width / 2;
  const d = SLAB.depth / 2;
  let floor = 0;
  return Array.from({ length: n }, (_, i) => {
    const z = (open[i] ?? 0) * SLAB.pull;
    const room = (SLAB.open * (open[i] ?? 0)) / 2;  // half the opening goes below the open slab, half above
    const bottom = floor + room;
    const top = bottom + SLAB.thick;
    floor = top + SLAB.gap + room;
    const face = (corners: [number, number, number][], strength: number): Face => ({ corners: corners.map(screen), strength });
    const faces: Face[] = [];
    const side = Math.sin(yaw) > 0 ? -w : w;  // the end that faces the viewer
    if (Math.sin(yaw) !== 0) faces.push(face([[side, bottom, z - d], [side, bottom, z + d], [side, top, z + d], [side, top, z - d]], 0.62));
    faces.push(face([[-w, bottom, z + d], [w, bottom, z + d], [w, top, z + d], [-w, top, z + d]], 0.5));
    const roof = face([[-w, top, z - d], [w, top, z - d], [w, top, z + d], [-w, top, z + d]], 0.22);
    faces.push(roof);
    const edge = roof.corners.reduce((a, b) => (b.x > a.x ? b : a));
    return { faces, label: { x: edge.x + 12, y: edge.y + 2 } };
  });
}

/** Whether (x, y) is inside a polygon (ray casting). */
export function inside(corners: Point[], x: number, y: number): boolean {
  let hit = false;
  for (let a = 0, b = corners.length - 1; a < corners.length; b = a++) {
    const p = corners[a];
    const q = corners[b];
    if ((p.y > y) !== (q.y > y) && x < ((q.x - p.x) * (y - p.y)) / (q.y - p.y) + p.x) hit = !hit;
  }
  return hit;
}

/** The topmost slab under a point (later slabs are painted over earlier ones), or null. */
export function slabAt(shapes: SlabShape[], x: number, y: number): number | null {
  for (let k = shapes.length - 1; k >= 0; k--) {
    if (shapes[k].faces.some((f) => inside(f.corners, x, y))) return k;
  }
  return null;
}
