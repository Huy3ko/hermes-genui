---
name: what-if
description: "What-if money maths with live sliders and a chart: loan EMI, prepayment, SIP, savings goal, retirement corpus. Use for what if, how much will I save, EMI, should I prepay, SIP returns, how long to reach a goal."
version: 0.1.0
platforms: [linux, macos, windows]
---
# What-if

Use this when someone asks a money "what if": a loan's EMI, prepaying a loan, a SIP's value, how long to reach a
savings goal. The `calculator` block does the maths live as sliders move; never do this maths in text.

## Steps

1. **Ask first.** When two or more of the amount, rate, years and the change they are weighing (a prepayment, a
   bigger SIP) are unknown, call `show_blocks` with ONE `form` and nothing else, every field prefilled with your best
   guess, and stop. The user's answer comes back as a message starting `Form: <title> (<id>)`, one `Label: value`
   line per field; build from it. Skip it when the user gave the numbers. Use a rate from search or the user; if you
   assume one, say so in one line. For "should I prepay my home loan?" (a snippet, not the layout):

   ```text
   {"type": "form", "id": "prepay", "title": "Your loan", "submit": "Work it out", "fields": [
     {"id": "p", "kind": "slider", "label": "Amount still owed", "group": "The loan", "min": 500000, "max": 20000000, "step": 100000, "value": 5000000, "unit": "₹"},
     {"id": "r", "kind": "slider", "label": "Interest rate", "group": "The loan", "min": 6, "max": 12, "step": 0.05, "value": 8.5, "unit": "%"},
     {"id": "n", "kind": "slider", "label": "Years left", "group": "The loan", "min": 1, "max": 30, "step": 1, "value": 20},
     {"id": "how", "kind": "radio", "label": "How would you prepay?", "group": "The change", "value": "yearly", "options": [
       {"value": "yearly", "label": "Every year", "note": "From a bonus or savings"},
       {"value": "once", "label": "One lump sum", "note": "A windfall, paid once"}]},
     {"id": "extra", "kind": "slider", "label": "How much each time", "group": "The change", "min": 0, "max": 1000000, "step": 25000, "value": 100000, "unit": "₹", "ends": ["A little", "A lot"]}
   ]}
   ```
2. **Pick the formulas** (helpers in the calculator; rates in %, terms in years):
   - loan: `emi(p, r, n)`; total interest `emi(p, r, n) * n * 12 - p`; owed after y years `balance(p, r, n, y)`,
     and `principal_paid` / `interest_paid` with the same arguments;
   - prepayment of `extra` a year: `prepay_years(p, r, n, extra)` and `prepay_interest(p, r, n, extra)`;
   - SIP: `sip(m, r, n)` for the end value, `sip_value(m, r, y)` for the value after y years;
   - savings goal: `max(goal - sip(m, r, n), 0)` for the gap.
3. **Lay it out** with one `show_blocks` call:
   - a `heading` saying the question;
   - one `calculator` with 2-6 sliders, up to 6 outputs and a live `chart`: `x` loops `y` from 0 to the years input
     (`"to": "n"`), `label: "Year {y}"`, 1-3 series using `y`. Slider ids must not be helper names (`emi`, `sip`,
     `max`...) and the loop name must not be a slider id;
   - one collapsed `section` per named scenario ("As is", "Prepay ₹1L a year"), each holding a small `calculator`
     preset to that scenario's values (no chart), so the tool does the sums, not you;
   - a `callout` (tone `tip`) with the key insight in words, e.g. why early prepayment saves most.
4. **Reply** with one sentence, then the tag on its own line.

## Layout example (prepaying a ₹50L home loan)

```json
[
  {"type": "heading", "text": "What if I prepay my home loan?"},
  {"type": "calculator", "inputs": [
    {"id": "p", "label": "Loan", "min": 500000, "max": 20000000, "step": 100000, "value": 5000000, "unit": "₹"},
    {"id": "r", "label": "Rate %", "min": 6, "max": 12, "step": 0.05, "value": 8.5},
    {"id": "n", "label": "Years", "min": 5, "max": 30, "step": 1, "value": 20},
    {"id": "extra", "label": "Prepay a year", "min": 0, "max": 1000000, "step": 25000, "value": 100000, "unit": "₹"}
  ], "outputs": [
    {"label": "EMI", "formula": "emi(p, r, n)", "unit": "₹"},
    {"label": "Interest, as is", "formula": "emi(p, r, n) * n * 12 - p", "unit": "₹"},
    {"label": "Interest with prepay", "formula": "prepay_interest(p, r, n, extra)", "unit": "₹"},
    {"label": "Interest saved", "formula": "emi(p, r, n) * n * 12 - p - prepay_interest(p, r, n, extra)", "unit": "₹"},
    {"label": "Years with prepay", "formula": "round(prepay_years(p, r, n, extra), 1)"}
  ], "chart": {
    "kind": "line", "title": "Owed vs paid, as is", "unit": "₹",
    "x": {"name": "y", "from": 0, "to": "n", "step": 1, "label": "Year {y}"},
    "series": [
      {"name": "Owed", "formula": "balance(p, r, n, y)"},
      {"name": "Principal paid", "formula": "principal_paid(p, r, n, y)"},
      {"name": "Interest paid", "formula": "interest_paid(p, r, n, y)"}
    ]
  }},
  {"type": "section", "title": "Scenario: as is", "collapsed": true, "children": [
    {"type": "calculator", "inputs": [
      {"id": "p", "label": "Loan", "min": 500000, "max": 20000000, "value": 5000000, "unit": "₹"},
      {"id": "r", "label": "Rate %", "min": 6, "max": 12, "value": 8.5},
      {"id": "n", "label": "Years", "min": 5, "max": 30, "value": 20}
    ], "outputs": [
      {"label": "EMI", "formula": "emi(p, r, n)", "unit": "₹"},
      {"label": "Total interest", "formula": "emi(p, r, n) * n * 12 - p", "unit": "₹"}
    ]}
  ]},
  {"type": "section", "title": "Scenario: prepay ₹2L a year", "collapsed": true, "children": [
    {"type": "calculator", "inputs": [
      {"id": "p", "label": "Loan", "min": 500000, "max": 20000000, "value": 5000000, "unit": "₹"},
      {"id": "r", "label": "Rate %", "min": 6, "max": 12, "value": 8.5},
      {"id": "n", "label": "Years", "min": 5, "max": 30, "value": 20},
      {"id": "extra", "label": "Prepay a year", "min": 0, "max": 1000000, "value": 200000, "unit": "₹"}
    ], "outputs": [
      {"label": "Years to close", "formula": "round(prepay_years(p, r, n, extra), 1)"},
      {"label": "Total interest", "formula": "prepay_interest(p, r, n, extra)", "unit": "₹"}
    ]}
  ]},
  {"type": "callout", "tone": "tip", "title": "Why it works", "text": "Early EMIs are mostly interest, so money prepaid in the first years cuts the most."}
]
```

## Rules

- Blocks only: never write HTML or use `::preview`, even for "interactive" maths. The calculator is interactive.
- Numbers and photo URLs only from tools or the user; never work out an EMI, total or gap yourself in text.
- A calculator takes 1-6 inputs, up to 6 outputs and a chart of 1-3 series (line, area or bar).
- Tax and fees are left out unless the user gives them; say so if it matters.
- No product or fund recommendations.
- Keep words short around the tag; the calculator shows the numbers.
