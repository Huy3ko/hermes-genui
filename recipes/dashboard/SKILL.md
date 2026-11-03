---
name: dashboard
description: "Lay out any topic as a visual dashboard with blocks: headline numbers, charts and tables side by side, a verdict. Budgets, comparisons of products or places, plans, reports."
version: 0.1.0
platforms: [linux, macos, windows]
---
# Dashboard

Use this when someone asks for a dashboard, an overview, a report or a comparison "visually", on any topic. For a
stock or company, the `stock-dashboard` recipe is more specific; use that instead.

## Steps

1. **Get the numbers.** If key inputs are unknown, ask with one form first: a single `form` block, every field
   prefilled with your best guess, then build from the answer. Use what the user gave you, then tools:
   `market_history` for prices, `find_photos` for photos, web search for facts. Note where each number came from.
   Never invent one; leave out what you can't find.
2. **Pick a shape.** A dashboard reads top to bottom:
   - a `heading` saying what it is;
   - `kpis` with the 2-4 numbers that matter most (each with a `trend` when you have its recent values);
   - one or two `columns` rows, each holding 2 blocks side by side: a `chart` beside a `table`, or two charts. Use a
     donut for a budget or shares (parts of a whole, 3-7 parts), a line for a trend (`tone: "change"` for one price
     or balance), bars for periods and `hbar` for a ranking or 2-5 named items, a `table` for 2-3 options across
     several metrics (`highlight` the best one). Never one small chart per metric;
   - optional extras where they help: a `timeline` for a plan, `images` for places, `progress` for a goal, a `list`
     for a ranking, a `heatmap` for a matrix, a `checklist` for things to tick off, a `calculator` for what-if maths,
     `actions` (or `button`s in a `row`) for the obvious next steps;
   - a `callout` with the verdict or the one thing to watch;
   - a `source` line when outside data was used.
3. **Draw it** with one `show_blocks` call. If a tool already made a board (market_history, find_photos), place it
   with `{"type": "include", "id": "<its id>"}` instead of copying its numbers.
4. **Reply** with one or two sentences, then the tag on its own line. The dashboard carries the detail.

## Layout example (a monthly budget the user described)

```json
[
  {"type": "heading", "text": "October budget"},
  {"type": "kpis", "items": [
    {"label": "Income", "value": 120000, "unit": "₹"},
    {"label": "Spent", "value": 108000, "unit": "₹"},
    {"label": "Saved", "value": 12000, "unit": "₹", "change": 10, "change_unit": "%", "trend": [9000, 10500, 10900, 12000]}
  ]},
  {"type": "columns", "children": [
    {"type": "chart", "kind": "donut", "title": "Where it went", "unit": "₹",
     "x": ["Rent", "SIP", "Groceries", "Travel", "Fun"], "series": [{"name": "Spend", "data": [30000, 25000, 15000, 8000, 10000]}]},
    {"type": "table", "caption": "Against plan", "columns": ["Category", "Plan", "Actual"], "highlight": {"row": 3},
     "rows": [["Rent", "₹30,000", "₹30,000"], ["Groceries", "₹12,000", "₹15,000"], ["Travel", "₹10,000", "₹8,000"], ["Fun", "₹8,000", "₹10,000"]]}
  ]},
  {"type": "callout", "tone": "tip", "text": "Groceries ran ₹3,000 over plan; travel came in under."}
]
```

## Rules

- Every object inside `children` and `tabs` is a block with its own `type` (a number card is
  `{"type": "stat", "label": …, "value": …}`, not a bare `{label, value}`).
- A calculator chart's `x.name` must differ from every input id (inputs `p`, `r`, `n`; axis `y`).
- Money: set `"unit": "₹"` (or the currency) on every money chart, kpi and calculator output; table cells "₹44,500".

- Blocks only: never write HTML or use `::preview` for a dashboard, even when it should be "interactive". Blocks
  are interactive: tabs, calculators with sliders, checklists, buttons, fold-out sections, sortable tables, flash
  cards.
- To switch between views (one per profile, per stock, per scenario), use `tabs` at the top level: one tab per view,
  each holding that view's kpis, columns and charts.
- For what-if charts (a loan's balance as the rate or term moves), give a `calculator` a `chart`; it redraws as the
  sliders move. Other charts are drawn once.
- Keep words short around it; don't repeat the numbers the blocks already show.
