/// <reference types="vite/client" />
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { readBlocks } from "../../core/readBlocks";
import { Blocks } from "../../core/Blocks";
import { withStyles } from "../../core/testing";
import flipCss from "./flip.css?raw";

afterEach(cleanup);

const quiz = { type: "flip", title: "Quiz", cards: [
  { front: "Most golds?", back: "China · 201" },
  { front: "Host?", back: "Nagoya", image: "https://x.example/n.jpg" },
] };

describe("Flip", () => {
  it("draws each card front up, with its number and the answer behind it", () => {
    const { container } = render(<Blocks blocks={readBlocks([quiz])} />);
    expect(screen.getByText("Quiz")).toBeTruthy();
    expect(screen.getByText("Most golds?")).toBeTruthy();
    expect(screen.getByText("China · 201")).toBeTruthy();
    expect(screen.getByText("1 of 2")).toBeTruthy();
    expect(screen.getAllByText("Answer").length).toBe(2);
    expect(container.querySelector(".hb-flip-grid")).not.toBeNull();
    expect(container.querySelector(".hb-flip-turned")).toBeNull();
    const img = container.querySelector(".hb-flip-back img") as HTMLImageElement;
    expect(img.getAttribute("src")).toBe("https://x.example/n.jpg");
    expect(img.getAttribute("referrerpolicy")).toBe("no-referrer");
  });

  it("turns one card at a time on a tap, and back again", () => {
    const { container } = render(<Blocks blocks={readBlocks([quiz])} />);
    const first = screen.getByRole("button", { name: /Most golds\?/ });
    fireEvent.click(first);
    expect(first.getAttribute("aria-pressed")).toBe("true");
    expect(container.querySelectorAll(".hb-flip-turned").length).toBe(1);
    fireEvent.click(first);
    expect(first.getAttribute("aria-pressed")).toBe("false");
  });

  it("makes every card in a set as tall as the photo cards need, so the grid stays even", () => {
    const { container } = render(<Blocks blocks={readBlocks([quiz])} />);
    expect(container.querySelector(".hb-flip-grid.hb-flip-tall")).not.toBeNull();
    cleanup();
    const plain = { ...quiz, cards: [quiz.cards[0]] };
    const again = render(<Blocks blocks={readBlocks([plain])} />);
    expect(again.container.querySelector(".hb-flip-tall")).toBeNull();
  });

  it("grows with its text: both faces share one grid cell, so the taller one sets the card's height", () => {
    const unstyle = withStyles(flipCss);
    const { container } = render(<Blocks blocks={readBlocks([quiz])} />);
    const card = getComputedStyle(container.querySelector(".hb-flip-card")!);
    expect(card.height).toBe("auto");
    expect(getComputedStyle(container.querySelector(".hb-flip-inner")!).display).toBe("grid");
    for (const face of container.querySelectorAll(".hb-flip-face")) {
      const s = getComputedStyle(face);
      expect([s.position, s.gridArea]).toEqual(["static", "1 / 1"]);
    }
    unstyle();
  });

  it("hides a back photo that fails to load", () => {
    const { container } = render(<Blocks blocks={readBlocks([quiz])} />);
    fireEvent.error(container.querySelector(".hb-flip-back img")!);
    expect(container.querySelector(".hb-flip-back img")).toBeNull();
    expect(screen.getByText("Nagoya")).toBeTruthy();
  });
});
