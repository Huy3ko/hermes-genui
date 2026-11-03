// What a calculator shows, and its live chart.
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { forgetBoards } from "../checklist/savedState";
import { Blocks } from "../../core/Blocks";
import { readBlocks } from "../../core/readBlocks";
import { drawWithActions as draw } from "../../core/testing";
import { interestPaid } from "../../lib/formula";

afterEach(cleanup);
beforeEach(() => forgetBoards());

describe("calculator", () => {
  it("works the results out again as a slider moves", () => {
    const { container } = draw([{ type: "calculator", title: "Home loan",
      inputs: [{ id: "p", label: "Loan", min: 1000000, max: 10000000, step: 100000, value: 4000000, unit: "₹" }],
      outputs: [{ label: "EMI", formula: "emi(p, 8.5, 20)", unit: "₹" }, { label: "Broken", formula: "p / 0" }] }]);
    expect(screen.getByText("₹34,713")).toBeTruthy();
    expect(screen.getByText("–")).toBeTruthy();
    fireEvent.change(container.querySelector("input[type=range]")!, { target: { value: "8000000" } });
    expect(screen.getByText("₹69,426")).toBeTruthy();
  });
});

describe("a calculator's chart", () => {
  it("is drawn under the results and redraws as a slider moves", () => {
    const { container } = draw([{ type: "calculator", title: "Home loan",
      inputs: [{ id: "p", label: "Loan", max: 10000000, value: 4000000, unit: "₹" }, { id: "r", label: "Rate", min: 6, max: 12, step: 0.5, value: 8.5 }],
      outputs: [{ label: "EMI", formula: "emi(p, r, 20)", unit: "₹" }],
      chart: { kind: "line", title: "Interest paid", x: { name: "y", from: 0, to: 20, step: 1, label: "Year {y}" },
        series: [{ name: "Interest", formula: "interest_paid(p, r, 20, y)" }], unit: "₹" } }]);
    const chart = container.querySelector(".hb-calc .hb-chart")!;
    expect(chart).toBeTruthy();
    const line = () => container.querySelector(".hb-calc path.hb-chart-line")!.getAttribute("d");
    const before = line();
    expect(before).toBeTruthy();
    fireEvent.change(container.querySelectorAll("input[type=range]")[1], { target: { value: "10" } });
    expect(line()).not.toBe(before);
    expect(interestPaid(4000000, 10, 20, 20)).toBeGreaterThan(interestPaid(4000000, 8.5, 20, 20));
  });
  it("shows no chart when no point can be worked out", () => {
    const { container } = draw([{ type: "calculator", inputs: [{ id: "p", value: 5 }], outputs: [{ label: "x", formula: "p" }],
      chart: { x: { name: "y", from: 0, to: 5, step: 1 }, series: [{ name: "Bad", formula: "p / 0" }] } }]);
    expect(container.querySelector(".hb-calc")).toBeTruthy();
    expect(container.querySelector(".hb-chart")).toBeNull();
  });
});

describe("calculator chart figure", () => {
  it("shows no headline number or change chip, only the title, lines and legend", () => {
    const calc = { type: "calculator", inputs: [{ id: "p", label: "Loan", min: 100000, max: 9000000, step: 100000, value: 4000000 },
      { id: "r", label: "Rate", min: 5, max: 12, step: 0.1, value: 8.5 }, { id: "n", label: "Years", min: 5, max: 30, step: 1, value: 20 }],
      outputs: [{ label: "EMI", formula: "emi(p, r, n)", unit: "₹" }],
      chart: { kind: "line", title: "Balance", x: { name: "y", from: 0, to: "n", step: 1 }, unit: "₹",
        series: [{ name: "Balance", formula: "balance(p, r, n, y)" }, { name: "Interest", formula: "interest_paid(p, r, n, y)" }] } };
    const { container } = render(<Blocks blocks={readBlocks([calc])} />);
    const chart = container.querySelector(".hb-calc .hb-chart")!;
    expect(chart.querySelector(".hb-chart-big")).toBeNull();
    expect(chart.querySelector(".hb-chip")).toBeNull();
    expect(chart.querySelectorAll(".hb-legend-item").length).toBe(2);
  });
});
