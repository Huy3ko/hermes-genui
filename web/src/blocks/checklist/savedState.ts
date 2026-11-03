// What the user did to a stored board (a checklist's ticks), saved on the server beside the board so it follows them
// to every device: GET and PUT /blocks/<id>/state. The state is one object per board, keyed by where each block sits
// in it ("0", "1.children.2"); a checklist's value is the list of ticked item numbers, [0, 3].
// Saving never shows an error: without the server the ticks simply live on screen until the reply is drawn again.
import type { Rest } from "../../host/actions";

type Board = { state: Record<string, unknown>; loaded: Promise<Record<string, unknown>>; saving: Promise<void> };
const boards = new Map<string, Board>();

/** Forget every board loaded so far (tests start each case clean). */
export function forgetBoards(): void {
  boards.clear();
}

/** The server's answer as a state object: {state: {"0": [1]}} → {"0": [1]};  {} (nothing saved yet) → {};  junk → {} */
function stateIn(answer: unknown): Record<string, unknown> {
  const state = (answer as { state?: unknown } | null)?.state;
  if (state && typeof state === "object" && !Array.isArray(state)) return { ...(state as Record<string, unknown>) };
  return {};
}

/**
 * A board's saved state, fetched once and shared by every block on it (two checklists in one board load it once). A
 * failed fetch gives {} and is forgotten, so the next block drawn tries again.
 *   board 7f3a09bc with {"0": [1]} saved → {"0": [1]};  nothing saved → {};  offline → {}
 */
export function loadBoardState(rest: Rest, blockId: string): Promise<Record<string, unknown>> {
  const known = boards.get(blockId);
  if (known) return known.loaded;
  const board: Board = { state: {}, loaded: Promise.resolve({}), saving: Promise.resolve() };
  board.loaded = rest(`/blocks/${blockId}/state`).then(
    (answer) => {
      board.state = stateIn(answer);
      return board.state;
    },
    () => {
      boards.delete(blockId);
      return {};
    },
  );
  boards.set(blockId, board);
  return board.loaded;
}

/**
 * Sets one block's value and saves the board's whole state, after its load and after any save before it (so the
 * server ends with the last tap). Two checklists on one board keep each other's ticks. Failures are swallowed.
 *   saved {"1": [0]}; saveBoardValue(rest, id, "0", [2]) → PUT {state: {"1": [0], "0": [2]}}
 *   the board's state can't be loaded → nothing is sent (the tick stays on screen)
 */
export async function saveBoardValue(rest: Rest, blockId: string, key: string, value: unknown): Promise<void> {
  await loadBoardState(rest, blockId);
  const board = boards.get(blockId);
  if (!board) return;  // the load failed: saving only this value could wipe what other blocks on the board saved
  board.state = { ...board.state, [key]: value };
  const state = board.state;
  board.saving = board.saving.then(() => rest(`/blocks/${blockId}/state`, { method: "PUT", body: { state } })).then(() => {}, () => {});
  await board.saving;
}

// --- Checklist ticks: the list of ticked item numbers, [0, 3] ------------------------------------------------------

/** Ticks after a tap on item `i`: an unticked item is ticked, a ticked one unticked; kept in order.
 *  [0, 3] tap 2 → [0, 2, 3];  [0, 3] tap 3 → [0] */
export function toggleTick(ticks: number[], i: number): number[] {
  if (ticks.includes(i)) return ticks.filter((t) => t !== i);
  return [...ticks, i].sort((a, b) => a - b);
}

/** What was saved for a checklist of `count` items, as ticks it can show; null when nothing usable was saved.
 *  [3, 0, 3] with 5 items → [0, 3];  [0, 9] with 5 items → [0] (item 9 isn't there);  "yes" → null;  undefined → null */
export function readTicks(saved: unknown, count: number): number[] | null {
  if (!Array.isArray(saved)) return null;
  const ticks = new Set<number>();
  for (const t of saved) {
    if (Number.isInteger(t) && t >= 0 && t < count) ticks.add(t);
  }
  return [...ticks].sort((a, b) => a - b);
}

/** What a checklist shows once its board's state arrives: the saved ticks, or the model's starting ticks when nothing
 *  is saved; but if the user tapped before it arrived (a slow connection), their taps, which are newer.
 *  saved [1, 2], not tapped → [1, 2];  nothing saved, started [0] → [0];  saved [1], tapped to [0, 1, 4] → [0, 1, 4] */
export function ticksAfterLoad(saved: number[] | null, onScreen: number[], tapped: boolean): number[] {
  if (tapped) return onScreen;
  return saved ?? onScreen;
}
