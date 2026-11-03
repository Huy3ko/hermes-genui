---
name: report
description: "A structured report on any topic with blocks: headline numbers, a fold-out section per theme, the bottom line, sources. Use for a report, brief, summary, news roundup, project status, research summary, weekly update."
version: 0.1.0
platforms: [linux, macos, windows]
---
# Report

Use this when someone asks for a report, a brief or a summary they will read top to bottom: a news brief, a
project status, a research summary. For a dashboard of numbers, use `dashboard`; for a stock, `stock-dashboard`.

## Steps

1. **Gather.** Use what the user gave, then web search (and `market_history` for prices). Note where each fact
   came from. Never invent a number; leave out what you can't find.
2. **Group into 2-5 themes** ("What happened", "Risks", "Next steps"). Each theme gets one section.
3. **Lay it out** with one `show_blocks` call, in this order:
   - a `heading` with the topic and the date or period;
   - `kpis` with the 2-4 numbers that matter most (only if you have real ones);
   - one `section` per theme with `collapsed: true`, holding a `text` (2-3 sentences) and, where it helps, a
     `table`, a `list` or a `chart`. Put the most important theme first and leave it open (`collapsed: false`);
   - a `callout` (tone `info`, title "Bottom line") with the conclusion in one or two sentences;
   - a `source` line naming the sites or documents.
4. **Reply** with one sentence, then the tag on its own line.

## Layout example (a project status the user described)

```json
[
  {"type": "heading", "text": "Website relaunch · status, week 6"},
  {"type": "kpis", "items": [
    {"label": "Tasks done", "value": 34, "unit": "of 50"},
    {"label": "Budget used", "value": 62, "unit": "%"},
    {"label": "Open bugs", "value": 9, "change": -4},
    {"label": "Days to launch", "value": 18}
  ]},
  {"type": "section", "title": "Progress", "collapsed": false, "children": [
    {"type": "text", "text": "Design and content are done. **Checkout** is the last big piece; it is in testing."},
    {"type": "table", "columns": ["Workstream", "Status", "Owner"], "rows": [
      ["Design", "Done", "Priya"],
      ["Content", "Done", "Arjun"],
      ["Checkout", "Testing", "Meera"],
      ["SEO", "Not started", "Arjun"]
    ]}
  ]},
  {"type": "section", "title": "Risks", "collapsed": true, "children": [
    {"type": "list", "items": [
      {"title": "Payment gateway sign-off", "subtitle": "Waiting on the bank", "value": "High", "icon": "alert"},
      {"title": "SEO not started", "subtitle": "Needs 2 weeks", "value": "Medium", "icon": "search"}
    ]}
  ]},
  {"type": "section", "title": "Next two weeks", "collapsed": true, "children": [
    {"type": "checklist", "title": "To do", "numbered": true, "items": [
      "Finish checkout tests", "Start SEO audit", "Load test the new site", "Plan launch day"
    ]}
  ]},
  {"type": "callout", "tone": "info", "title": "Bottom line", "text": "On track for launch if the payment gateway signs off this week."},
  {"type": "source", "text": "Project tracker and team updates, as shared by the user"}
]
```

## Rules

- Blocks only: never write HTML or use `::preview` for a report.
- Numbers only from tools, search or the user; say "not reported" rather than guessing. Photo URLs only from
  `find_photos`.
- `kpis` take up to 4 items; a section can't hold another section; at most 40 top-level blocks.
- One `callout` per report: the bottom line. Facts go in sections, opinions are marked as such.
- Keep words short around the tag; don't repeat what the sections say.
