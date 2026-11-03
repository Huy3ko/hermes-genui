// Reading stored blocks: JSON from the plugin's store → blocks the drawing code can draw. Each type has its own reader
// in blocks/<type>/read.ts, with a comment and a worked example, listed in registry.tsx. The rule throughout: drop what
// doesn't fit and note why; never show broken data.
import { REGISTRY, type Block } from "../registry";
import { Trail, type Diagnostic } from "./fields";

/** Every block type that can be drawn, containers included. */
export const BLOCK_TYPES: string[] = Object.keys(REGISTRY);

/**
 * Stored JSON → its blocks and notes on what was dropped. A lone block object is a list of one, and the store's
 * {blocks: [...]} envelope is unwrapped. Anything else gives no blocks.
 *   [{type: "heading", text: "Day 1"}, {type: "weather"}]
 *   → {blocks: [{type: "heading", text: "Day 1"}], dropped: [{path: "1", why: 'unknown type "weather"'}]}
 */
export function readBlocksNoted(data: unknown): { blocks: Block[]; dropped: Diagnostic[] } {
  let list: unknown = data;
  if (isObject(list) && Array.isArray((list as any).blocks)) list = (list as any).blocks;
  if (isObject(list) && typeof (list as any).type === "string") list = [list];
  const top = new Trail();
  const blocks: Block[] = [];
  if (Array.isArray(list)) {
    list.forEach((raw, i) => {
      blocks.push(...readOne(raw, top.at(i), 0));
    });
  }
  return { blocks, dropped: top.dropped };
}

/** Just the blocks to draw. */
export function readBlocks(data: unknown): Block[] {
  return readBlocksNoted(data).blocks;
}

function isObject(v: unknown): boolean {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/** One item (top level or a container's child) → zero, one or several blocks (a flattened container gives its
 *  children). `depth` counts the containers above it. */
function readOne(raw: unknown, here: Trail, depth: number): Block[] {
  if (!isObject(raw)) {
    here.drop("not a block object");
    return [];
  }
  const kind = (raw as any).type;
  const entry = Object.hasOwn(REGISTRY, kind) ? REGISTRY[kind as Block["type"]] : undefined;
  if (!entry) {
    here.drop(`unknown type "${kind}"`);
    return [];
  }
  const read = entry.read(raw, here, depth, readOne);
  if (!read) return [];
  return Array.isArray(read) ? read : [read];
}
