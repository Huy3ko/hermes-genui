---
name: compare
description: "Compare 2-4 options side by side with blocks: a tab per option, a Compare tab with cards, a table and one trend line, a verdict. Use for compare, X vs Y, which is better, pick between phones, plans, places, cars or stocks."
version: 0.1.0
platforms: [linux, macos, windows]
---
# Compare

Use this when someone asks to compare 2-4 options: products, plans, places, courses or stocks ("X vs Y", "which
should I pick"). For one stock in depth, use `stock-dashboard`; for 5 or more options, a ranked `list` or a single
`table` is clearer.

## Steps

1. **Get the facts.** Use what the user gave, then web search for prices and specs. For stocks, call
   `market_history` with the symbols comma separated (`"TCS, INFY"`, up to 3) and keep the board id it returns.
   Note where each number came from. Never guess a number; write "not found" instead.
2. **Pick 3-5 metrics** that decide it (price, battery, rating, fees). Use the same metrics for every option.
3. **Lay it out** with one `show_blocks` call:
   - a `heading` naming the options;
   - `tabs` at the top level: one tab per option, then a last tab "Compare" (2-6 tabs in all):
     - an option's tab: `kpis` with its 2-4 key numbers, then a `text` with its strengths and weaknesses (and
       `images` only with URLs `find_photos` returned);
     - the Compare tab: `kpis` with one card per option (its deciding number, with `trend` when you have its
       history); a `table` with one row per option and a column per metric, `highlight` the winner's row; and, when
       the options have a history over the same dates (prices, fees, rents), one `line` chart of % change from the
       same start (every series starts at 0, `unit` "%", `figure` false). Never one small bar chart per metric: the
       table already compares them. For stocks, put `{"type": "include", "id": "<market_history id>"}` here instead
       of all this: its board already has a card per stock and the % change line;
   - a `callout` (tone `info`, title "Verdict") after the tabs: who should pick which, in one or two sentences;
   - a `source` line naming the sites.
4. **Reply** with one sentence, then the tag on its own line.

## Layout example (two phones the user is choosing between)

```json
[
  {"type": "heading", "text": "Pixel 10a vs Nothing Phone 4"},
  {"type": "tabs", "tabs": [
    {"label": "Pixel 10a", "children": [
      {"type": "kpis", "items": [
        {"label": "Price", "value": 44999, "unit": "₹"},
        {"label": "Battery", "value": 5100, "unit": "mAh"},
        {"label": "Updates", "value": 7, "unit": "years"}
      ]},
      {"type": "text", "text": "**Best camera** in the range and the longest updates. Slower charging."}
    ]},
    {"label": "Nothing Phone 4", "children": [
      {"type": "kpis", "items": [
        {"label": "Price", "value": 39999, "unit": "₹"},
        {"label": "Battery", "value": 5000, "unit": "mAh"},
        {"label": "Updates", "value": 5, "unit": "years"}
      ]},
      {"type": "text", "text": "**Cheaper** with a brighter screen and fast charging. Camera is only OK."}
    ]},
    {"label": "Compare", "children": [
      {"type": "kpis", "items": [
        {"label": "Pixel 10a", "value": 44999, "unit": "₹", "trend": [47999, 46999, 45999, 44999]},
        {"label": "Nothing Phone 4", "value": 39999, "unit": "₹", "trend": [44999, 42999, 41999, 39999]}
      ]},
      {"type": "table", "caption": "Side by side", "columns": ["Phone", "Price", "Battery", "Updates", "Camera"],
       "highlight": {"row": 0},
       "rows": [["Pixel 10a", "₹44,999", "5,100 mAh", "7 years", "Best in class"],
                ["Nothing Phone 4", "₹39,999", "5,000 mAh", "5 years", "OK"]]},
      {"type": "chart", "kind": "line", "title": "Price since launch (% change)", "unit": "%", "figure": false,
       "x": ["Jul", "Aug", "Sep", "Oct"],
       "series": [{"name": "Pixel 10a", "data": [0, -2.1, -4.2, -6.3]},
                  {"name": "Nothing Phone 4", "data": [0, -4.4, -6.7, -11.1]}]}
    ]}
  ]},
  {"type": "callout", "tone": "info", "title": "Verdict", "text": "Pixel if photos and long support matter; Nothing if price and charging speed do."},
  {"type": "source", "text": "store.google.com · nothing.tech · gsmarena.com"}
]
```

## Rules

- Blocks only: never write HTML or use `::preview` for a comparison.
- Numbers and photo URLs only from tools, search or the user. Stock prices only through `market_history`'s board.
- Tabs: 2-6, top level only, labels up to 30 characters. 4 options plus Compare is 5 tabs; keep each one short.
  `kpis` take up to 4 items; `columns` 2-3 children.
- Highlight one winner only when the facts make it clear; otherwise leave `highlight` out and say "it depends".
- No buy or sell advice for stocks.
- Keep words short around the tag; the tabs carry the detail.
