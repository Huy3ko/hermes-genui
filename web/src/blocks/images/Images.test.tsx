import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { ImagesBlock } from "./read";
import { Images } from "./Images";

afterEach(cleanup);

const block: ImagesBlock = { type: "images", title: "Lisbon", images: [
  { url: "https://a.example/alfama.jpg", caption: "Alfama rooftops", source: "a.example" },
  { url: "https://b.example/tram.jpg", caption: "Tram 28", source: "b.example" },
] };

describe("Images", () => {
  it("shows each photo with its caption and credit", () => {
    render(<Images block={block} />);
    expect(screen.getByText("Lisbon")).toBeTruthy();
    expect(screen.getByText("Alfama rooftops")).toBeTruthy();
    expect(screen.getByText("b.example")).toBeTruthy();
    expect(document.querySelectorAll(".hb-photo img").length).toBe(2);
  });

  it("hides a photo that fails to load and keeps the rest", () => {
    render(<Images block={block} />);
    fireEvent.error(document.querySelector('img[src="https://a.example/alfama.jpg"]')!);
    expect(screen.queryByText("Alfama rooftops")).toBeNull();
    expect(screen.getByText("Tram 28")).toBeTruthy();
  });

  it("draws nothing when every photo fails", () => {
    const { container } = render(<Images block={block} />);
    for (const img of [...document.querySelectorAll(".hb-photo img")]) fireEvent.error(img);
    expect(container.innerHTML).toBe("");
  });

  it("opens a photo full size on click and closes it again", () => {
    render(<Images block={block} />);
    fireEvent.click(screen.getByRole("button", { name: /Tram 28/ }));
    const big = document.querySelector(".hb-photo-overlay img") as HTMLImageElement;
    expect(big.getAttribute("src")).toBe("https://b.example/tram.jpg");
    fireEvent.click(document.querySelector(".hb-photo-overlay")!);
    expect(document.querySelector(".hb-photo-overlay")).toBeNull();
  });
});
