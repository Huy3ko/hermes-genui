import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Blocks } from "../../core/Blocks";
import { readBlocks } from "../../core/readBlocks";

afterEach(cleanup);

const stack = { type: "layers", title: "The transformer stack", caption: "Simplified to one stack.", layers: [
  { id: "embed", label: "Embedding", tone: "blue", note: "Turns each token into a **vector**." },
  { id: "l1", label: "Layer 1", tone: "violet", note: "Attention, then feed-forward." },
  { id: "out", label: "Output", tone: "green", note: "Scores every word." },
] };

const draw = () => render(<Blocks blocks={readBlocks([stack])} />);
const drawing = () => screen.getByRole("img");
const pressed = () => screen.getAllByRole("button", { pressed: true }).map((b) => b.textContent);

describe("Layers", () => {
  it("opens on the bottom slab: its note, its place, its button pressed, and a label describing it", () => {
    const { container } = draw();
    expect(screen.getByText("1 of 3")).toBeTruthy();
    expect(container.querySelector(".hb-steps-text strong")!.textContent).toBe("vector");
    expect(pressed()).toEqual(["Embedding"]);
    expect(drawing().getAttribute("aria-label")).toBe(
      "The transformer stack in 3D, Embedding pulled out, 1 of 3. Turns each token into a vector.");
    expect(screen.getByText("Simplified to one stack.")).toBeTruthy();
  });

  it("moves with Back / Next, the slab buttons, ← → beside the drawing and ↑ ↓ on it", () => {
    const { container } = draw();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(pressed()).toEqual(["Layer 1"]);
    fireEvent.click(screen.getByRole("button", { name: "Output" }));
    expect(screen.getByText("3 of 3")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Next" }).hasAttribute("disabled")).toBe(true);
    fireEvent.keyDown(container.querySelector(".hb-layers-side")!, { key: "ArrowLeft" });
    expect(pressed()).toEqual(["Layer 1"]);
    fireEvent.keyDown(drawing(), { key: "ArrowDown" });
    expect(pressed()).toEqual(["Embedding"]);
    fireEvent.keyDown(drawing(), { key: "ArrowUp" });
    expect(pressed()).toEqual(["Layer 1"]);
  });

  it("turns with ← → on the drawing without changing the slab", () => {
    draw();
    fireEvent.keyDown(drawing(), { key: "ArrowRight" });
    fireEvent.keyDown(drawing(), { key: "ArrowLeft" });
    expect(pressed()).toEqual(["Embedding"]);
    expect(drawing().getAttribute("tabindex")).toBe("0");
  });
});
