import { beforeEach, describe, expect, it, vi } from "vitest";
import { forgetBoards, loadBoardState, readTicks, saveBoardValue, ticksAfterLoad, toggleTick } from "./savedState";

describe("ticks", () => {
  it("a tap ticks or unticks one item, keeping them in order", () => {
    expect(toggleTick([0, 3], 2)).toEqual([0, 2, 3]);
    expect(toggleTick([0, 3], 3)).toEqual([0]);
    expect(toggleTick([], 0)).toEqual([0]);
  });
  it("reads saved ticks for a checklist of a given size, and nothing usable as null", () => {
    expect(readTicks([3, 0, 3], 5)).toEqual([0, 3]);
    expect(readTicks([0, 9, -1, 1.5, "2"], 5)).toEqual([0]);
    expect(readTicks("yes", 5)).toBeNull();
    expect(readTicks(undefined, 5)).toBeNull();
  });
  it("after loading: saved ticks win until the user taps; taps made meanwhile are kept", () => {
    expect(ticksAfterLoad([1, 2], [0], false)).toEqual([1, 2]);
    expect(ticksAfterLoad(null, [0], false)).toEqual([0]);
    expect(ticksAfterLoad([1], [0, 1, 4], true)).toEqual([0, 1, 4]);
  });
});

describe("a board's state on the server", () => {
  beforeEach(() => forgetBoards());

  it("loads once per board and unwraps {state}; nothing saved is {}", async () => {
    const rest = vi.fn(async () => ({ state: { "0": [1] } }));
    expect(await loadBoardState(rest, "7f3a09bc")).toEqual({ "0": [1] });
    expect(await loadBoardState(rest, "7f3a09bc")).toEqual({ "0": [1] });
    expect(rest).toHaveBeenCalledTimes(1);
    expect(rest).toHaveBeenCalledWith("/blocks/7f3a09bc/state");
    expect(await loadBoardState(vi.fn(async () => ({})), "0badc0de")).toEqual({});
  });

  it("a failed load gives {} and is tried again next time", async () => {
    const rest = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ state: { "0": [2] } });
    expect(await loadBoardState(rest, "7f3a09bc")).toEqual({});
    expect(await loadBoardState(rest, "7f3a09bc")).toEqual({ "0": [2] });
  });

  it("saves the whole board's state, keeping what other checklists on it saved", async () => {
    const puts: unknown[] = [];
    const rest = vi.fn(async (_path: string, init?: { method?: string; body?: unknown }) => {
      if (init?.method === "PUT") puts.push(init.body);
      return { state: { "1": [0] } };
    });
    await saveBoardValue(rest, "7f3a09bc", "0", [2]);
    await saveBoardValue(rest, "7f3a09bc", "0", [2, 3]);
    expect(puts).toEqual([{ state: { "1": [0], "0": [2] } }, { state: { "1": [0], "0": [2, 3] } }]);
    expect(rest).toHaveBeenCalledWith("/blocks/7f3a09bc/state", { method: "PUT", body: { state: { "1": [0], "0": [2, 3] } } });
  });

  it("a failed save is swallowed: the tick stays on screen", async () => {
    const rest = vi.fn(async (_path: string, init?: { method?: string }) => {
      if (init?.method === "PUT") throw new Error("413");
      return {};
    });
    await expect(saveBoardValue(rest, "7f3a09bc", "0", [1])).resolves.toBeUndefined();
  });
});

describe("a board whose state can't be loaded", () => {
  beforeEach(() => forgetBoards());
  it("isn't saved over: only one value would wipe what other checklists saved", async () => {
    const rest = vi.fn(async () => { throw new Error("offline"); });
    await saveBoardValue(rest, "7f3a09bc", "0", [1]);
    expect(rest.mock.calls.every((call: unknown[]) => call.length === 1)).toBe(true);
  });
});
