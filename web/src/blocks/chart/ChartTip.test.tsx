import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ChartTip, tipPlace } from "./ChartTip";
import { stepPick } from "./pick";

afterEach(cleanup);

describe("tipPlace", () => {
  it("sits 12px right of and above the pointer", () => {
    expect(tipPlace(100, 200, 120, 60, 600)).toEqual({ left: 112, top: 128 });
  });
  it("flips to the left near the right edge", () => {
    expect(tipPlace(550, 200, 120, 60, 600)).toEqual({ left: 418, top: 128 });
  });
  it("drops below the pointer near the top", () => {
    expect(tipPlace(100, 20, 120, 60, 600)).toEqual({ left: 112, top: 34 });
  });
  it("never leaves through the left edge", () => {
    expect(tipPlace(50, 200, 120, 60, 100).left).toBe(2);
  });
});

describe("stepPick", () => {
  it("moves with the arrow keys and stops at the ends", () => {
    expect(stepPick(null, "ArrowRight", 5)).toBe(0);
    expect(stepPick(null, "ArrowLeft", 5)).toBe(4);
    expect(stepPick(2, "ArrowRight", 5)).toBe(3);
    expect(stepPick(4, "ArrowRight", 5)).toBe(4);
    expect(stepPick(0, "ArrowLeft", 5)).toBe(0);
  });
  it("hides on Escape and ignores other keys", () => {
    expect(stepPick(3, "Escape", 5)).toBeNull();
    expect(stepPick(3, "Enter", 5)).toBeUndefined();
    expect(stepPick(3, "ArrowDown", 5)).toBeUndefined();
  });
  it("moves with up and down too for rows", () => {
    expect(stepPick(1, "ArrowDown", 5, true)).toBe(2);
    expect(stepPick(1, "ArrowUp", 5, true)).toBe(0);
  });
});

describe("ChartTip", () => {
  const tip = { x: 10, y: 10, title: "Q3", rows: [{ colour: "var(--hb-chart-1)", name: "Revenue", value: "4,213,500,000" }], note: "40% of total" };

  it("shows the title, a row per series with its swatch, and the note", () => {
    const { container } = render(<div style={{ position: "relative" }}><ChartTip tip={tip} /></div>);
    const card = container.querySelector(".hb-tip")!;
    expect(card.classList.contains("hb-tip-on")).toBe(true);
    expect(card.querySelector(".hb-tip-title")!.textContent).toBe("Q3");
    expect(card.querySelector(".hb-tip-name")!.textContent).toBe("Revenue");
    expect(card.querySelector(".hb-tip-value")!.textContent).toBe("4,213,500,000");
    expect((card.querySelector(".hb-tip-row i") as HTMLElement).style.background).toBe("var(--hb-chart-1)");
    expect(card.querySelector(".hb-tip-note")!.textContent).toBe("40% of total");
  });

  it("fades out keeping its last contents when hidden", () => {
    const { container, rerender } = render(<ChartTip tip={tip} />);
    rerender(<ChartTip tip={null} />);
    const card = container.querySelector(".hb-tip")!;
    expect(card.classList.contains("hb-tip-on")).toBe(false);
    expect(card.textContent).toContain("Q3");
  });
});
