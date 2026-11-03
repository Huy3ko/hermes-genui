/// <reference types="vite/client" />
// How wide blocks are on a wide screen: the board stops at a reading width, a chart, calculator or form at the top of
// a reply stops sooner, and inside a layout block (columns, grid, section, tabs) every block fills its place. (A row
// holding a wide block is drawn as a stack: layout/read.ts.) Side by side, each block keeps its own height.
import { cleanup, render } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import catalog from "../../../core/catalog.json";
import { Blocks } from "../core/Blocks";
import { readBlocks } from "../core/readBlocks";
import { withStyles } from "../core/testing";
import tokens from "./tokens.css?raw";
import shared from "./shared.css?raw";
import layout from "../blocks/layout/layout.css?raw";
import chart from "../blocks/chart/chart.css?raw";
import table from "../blocks/table/table.css?raw";
import calculator from "../blocks/calculator/calculator.css?raw";
import form from "../blocks/form/form.css?raw";

let unstyle: () => void;
beforeAll(() => (unstyle = withStyles(tokens, shared, layout, chart, table, calculator, form)));
afterAll(() => unstyle());
afterEach(cleanup);

const example = (kind: string) => catalog.blocks.find((b) => b.kind === kind)!.example;
const draw = (blocks: unknown[]) => render(<Blocks blocks={readBlocks(blocks)} />).container;
const style = (root: HTMLElement, selector: string) => getComputedStyle(root.querySelector(selector)!);

const wrappers: Record<string, (child: unknown) => unknown> = {
  columns: (child) => ({ type: "columns", children: [child, example("table")] }),
  grid: (child) => ({ type: "grid", children: [child, { type: "text", text: "Beside it" }] }),
  section: (child) => ({ type: "section", title: "Numbers", children: [child] }),
  tabs: (child) => ({ type: "tabs", tabs: [{ label: "One", children: [child] }, { label: "Two", children: [example("text")] }] }),
};

describe("block widths", () => {
  it("stop the whole board at a reading width", () => {
    expect(style(draw([{ type: "text", text: "Hi" }]), ".hb-blocks").maxWidth).toBe("1100px");
  });

  it("stop a chart, calculator or form at 720px at the top of a reply, and a long line at the board's width", () => {
    const root = draw([example("chart"), example("calculator"), example("form")]);
    expect(style(root, ".hb-blocks > .hb-chart").maxWidth).toBe("720px");
    expect(style(root, ".hb-calc").maxWidth).toBe("720px");
    expect(style(root, ".hb-form").maxWidth).toBe("720px");
    cleanup();
    const x = Array.from({ length: 60 }, (_, i) => `d${i}`);
    const long = draw([{ type: "chart", kind: "line", x, series: [{ data: x.map((_, i) => i) }] }]);
    expect(style(long, ".hb-chart").maxWidth).toBe("none");
  });

  it.each(Object.keys(wrappers))("let a chart, calculator and form fill their place in %s", (kind) => {
    const root = draw([wrappers[kind](example("chart")), wrappers[kind](example("calculator")), wrappers[kind](example("form"))]);
    for (const selector of [".hb-chart", ".hb-calc", ".hb-form"]) expect(style(root, selector).maxWidth, selector).toBe("none");
  });

  it("keep each block's own height side by side: a short card beside a tall one isn't stretched to match", () => {
    for (const kind of ["columns", "grid"]) {
      cleanup();
      const root = draw([{ type: kind, children: [example("progress"), example("calculator")] }]);
      expect(style(root, `.hb-${kind}`).alignItems, kind).toBe("start");
      expect(style(root, ".hb-progress").flexGrow, kind).not.toBe("1");
    }
  });

  it("let a table fill a column or cell beside other blocks, and hug its columns elsewhere", () => {
    expect(style(draw([example("table")]), ".hb-table-card").width).toBe("fit-content");
    for (const kind of ["columns", "grid"]) {
      cleanup();
      expect(style(draw([wrappers[kind](example("table"))]), ".hb-table-card").width, kind).toBe("auto");
    }
  });
});
