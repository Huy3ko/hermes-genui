// Where a steps block has got to in each flow it walks, per flow id, shared by the blocks of one board: the steps
// block says which steps it has and which one it shows (and the one before), and the flow with that id works out
// what to draw from it (walk.ts). Each board (one `Blocks`) has its own, so a steps block never moves a flow in
// another reply. Ids nobody draws are simply never read.
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { FlowMove } from "../steps/read";

/** A walk: the steps, the one shown, and the one shown before it (null at first), so the flow can tell Next from a
 *  jump. */
export type Walk = { steps: readonly FlowMove[]; at: number; from: number | null };

type Walks = {
  walks: ReadonlyMap<string, Walk>;
  /** Sets the walk of flow `flow`, or clears it with undefined. */
  setWalk: (flow: string, walk: Walk | undefined) => void;
};

// Outside a board (a block drawn on its own) no flow is walked and setting a walk does nothing.
const FlowWalks = createContext<Walks>({ walks: new Map(), setWalk: () => {} });

export function FlowLightBoard({ children }: { children: ReactNode }) {
  const [walks, setWalks] = useState<ReadonlyMap<string, Walk>>(() => new Map());
  const setWalk = useCallback((flow: string, walk: Walk | undefined) => {
    setWalks((was) => {
      const old = was.get(flow);
      if (old === walk || (old && walk && old.steps === walk.steps && old.at === walk.at && old.from === walk.from)) return was;
      const next = new Map(was);
      if (walk === undefined) next.delete(flow);
      else next.set(flow, walk);
      return next;
    });
  }, []);
  const value = useMemo(() => ({ walks, setWalk }), [walks, setWalk]);
  return <FlowWalks.Provider value={value}>{children}</FlowWalks.Provider>;
}

/** The walk of the flow with this id: useWalk("tf") → {steps, at: 2, from: 1};  a flow without an id → undefined */
export function useWalk(flow: string | undefined): Walk | undefined {
  const { walks } = useContext(FlowWalks);
  return flow === undefined ? undefined : walks.get(flow);
}

/** The function that sets a flow's walk: setWalk("tf", {steps, at: 2, from: 1}). */
export function useSetWalk(): Walks["setWalk"] {
  return useContext(FlowWalks).setWalk;
}
