import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { pinLocale } from "../../lib/locale.testing";
import { Blocks } from "../../core/Blocks";
import { readBlocks } from "../../core/readBlocks";
import { unitFor } from "./Streak";

afterEach(cleanup);

describe("Streak", () => {
  it("says day, not days, for a count of one", () => {
    expect(unitFor(1, "days")).toBe("day");
    expect(unitFor(3, "days")).toBe("days");
    expect(unitFor(1, "km")).toBe("km");
  });
  it("draws the count and the week, done days ticked and today marked", () => {
    const { container } = render(<Blocks blocks={readBlocks([{ type: "streak", count: 2,
      days: [{ label: "Mon", done: true }, { label: "Tue", done: true }, { label: "Wed", date: "11", today: true }] }])} />);
    expect(screen.getByText("Current streak")).toBeTruthy();
    expect(container.querySelector(".hb-streak-count")!.textContent).toBe("2 days");
    expect(container.querySelectorAll(".hb-streak-done").length).toBe(2);
    expect(container.querySelector(".hb-streak-today")!.textContent).toContain("Wed");
    expect(screen.getByText("11")).toBeTruthy();
  });
});

describe("streak count in the user's locale", () => {
  afterEach(() => vi.restoreAllMocks());
  it("groups the count the local way", () => {
    pinLocale("de-DE");
    const { container } = render(<Blocks blocks={readBlocks([{ type: "streak", count: 1234, label: "Days running", unit: "days" }])} />);
    expect(container.querySelector(".hb-streak-count")!.textContent).toBe("1.234 days");
  });
});
