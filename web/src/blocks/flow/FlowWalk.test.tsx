// A flow walked by a steps block that changes it: chips, dimmed boxes ahead, the layer counter and the packet.
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Blocks } from "../../core/Blocks";
import { readBlocks } from "../../core/readBlocks";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  delete (window as any).matchMedia;
  delete (Element.prototype as any).animate;
});

const flow = { type: "flow", id: "tf", title: "One pass makes one new token", nodes: [
  { id: "tok", label: "Tokens", holds: ["The", "animal"] },
  { id: "emb", label: "Embeddings", holds: ["a vector each"] },
  { id: "attn", label: "Self-attention" },
  { id: "ffn", label: "Feed-forward" },
], groups: [{ label: "Repeated", nodes: ["attn", "ffn"], count: 6 }] };
const steps = { type: "steps", for: "tf", items: [
  { title: "Cut the text", node: "tok" },
  { title: "Embed", node: "emb", send: true, holds: { emb: ["[.2 −1.1 …]", { text: "[.8 .3 …]", tone: "accent" }] } },
  { title: "Attend", node: "attn", send: true },
  { title: "Five more layers", node: "ffn", tick: 5 },
  { title: "Again", node: "tok", send: true },
] };

const draw = (blocks: unknown[]) => render(<Blocks blocks={readBlocks(blocks)} />);
const next = () => fireEvent.click(screen.getByRole("button", { name: "Next" }));
const chipsOf = (c: HTMLElement, label: string) =>
  [...[...c.querySelectorAll(".hb-flow-node")].find((n) => n.textContent!.startsWith(label))!.querySelectorAll(".hb-flow-chip")]
    .map((chip) => chip.textContent);
const idle = (c: HTMLElement) => [...c.querySelectorAll(".hb-flow-idle .hb-flow-label")].map((n) => n.textContent);
const counter = (c: HTMLElement) => c.querySelector(".hb-flow-count")!.textContent;

describe("Flow with contents", () => {
  it("draws what each box holds, an accent chip picked out, and the group's count at rest", () => {
    const { container } = draw([flow]);
    expect(chipsOf(container, "Tokens")).toEqual(["The", "animal"]);
    expect(counter(container)).toBe("× 6");
    expect(idle(container)).toEqual([]);  // no walk: nothing dimmed
  });

  it("steps change the chips, dim the boxes this pass hasn't reached and count the layers", () => {
    const { container } = draw([flow, steps]);
    expect(idle(container)).toEqual(["Embeddings", "Self-attention", "Feed-forward"]);
    next();
    expect(chipsOf(container, "Embeddings")).toEqual(["[.2 −1.1 …]", "[.8 .3 …]"]);
    expect(container.querySelector(".hb-flow-chip-accent")!.textContent).toBe("[.8 .3 …]");
    expect(idle(container)).toEqual(["Self-attention", "Feed-forward"]);
    next();
    expect(counter(container)).toBe("layer 1 of 6");
    next();
    expect(counter(container)).toBe("layer 6 of 6");
    next();  // back to the first box: a new pass
    expect(counter(container)).toBe("× 6");
    expect(idle(container)).toEqual(["Embeddings", "Self-attention", "Feed-forward"]);
    expect(chipsOf(container, "Embeddings")).toEqual(["[.2 −1.1 …]", "[.8 .3 …]"]);
    fireEvent.click(screen.getByRole("button", { name: "Step 1: Cut the text" }));
    expect(chipsOf(container, "Embeddings")).toEqual(["a vector each"]);
  });

  it("slides a packet to the next box on Next, loops it for a tick, and lands at once on Back", () => {
    const finished = Promise.resolve();
    const animate = vi.fn(() => ({ finished, cancel: vi.fn() }));
    (Element.prototype as any).animate = animate;
    const { container } = draw([flow, steps]);
    next();
    expect(animate).toHaveBeenCalledTimes(1);
    expect(container.querySelector(".hb-flow-packet")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(animate).toHaveBeenCalledTimes(1);
  });

  it("sends no packet when the reader asks for less motion, and every change lands at once", () => {
    (window as any).matchMedia = (q: string) => ({ matches: q.includes("reduce"), addEventListener() {}, removeEventListener() {} });
    const animate = vi.fn(() => ({ finished: Promise.resolve(), cancel: vi.fn() }));
    (Element.prototype as any).animate = animate;
    const { container } = draw([flow, steps]);
    next();
    expect(animate).not.toHaveBeenCalled();
    expect(chipsOf(container, "Embeddings")).toEqual(["[.2 −1.1 …]", "[.8 .3 …]"]);
  });

  it("keeps a board whose steps only light boxes exactly as it was: nothing dimmed, no counter", () => {
    const plain = { type: "flow", id: "tf", nodes: [{ id: "a", label: "A" }, { id: "b", label: "B" }],
      groups: [{ label: "Repeated × 12 layers", nodes: ["b"] }] };
    const { container } = draw([plain, { type: "steps", for: "tf", items: [{ title: "1", node: "a" }, { title: "2", node: "b" }] }]);
    expect(idle(container)).toEqual([]);
    expect(container.querySelector(".hb-flow-count")).toBeNull();
    expect(container.querySelector(".hb-flow-holds")).toBeNull();
    expect(container.querySelector(".hb-flow-lit .hb-flow-label")!.textContent).toBe("A");
  });
});
