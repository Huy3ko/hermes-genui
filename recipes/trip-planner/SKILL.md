---
name: trip-planner
description: "Plan a trip with blocks: itinerary day by day, places to pick, budget, packing list. Use for plan a trip, itinerary, holiday, vacation, weekend away, road trip, things to do in a city."
version: 0.1.0
platforms: [linux, macos, windows]
---
# Trip planner

Use this when someone wants to plan a trip, an itinerary, a holiday or a weekend away. For a single question ("is
Ooty cold in December?") just answer; no board needed.

## Steps

1. **Ask first.** A vague ask ("plan a weekend in Goa") leaves the key choices open. When two or more of dates,
   travellers, budget, pace and interests are unknown, call `show_blocks` with ONE `form` and nothing else, every
   field prefilled with your best guess, and stop. The user's answer comes back as a message starting
   `Form: <title> (<id>)`, one `Label: value` line per field; build the plan below from it. Skip the form when the
   user already gave these, and never ask twice. For Goa, the form looks like this (a snippet, not the layout):

   ```text
   {"type": "form", "id": "goa-trip", "title": "Goa weekend: quick choices", "submit": "Plan it", "fields": [
     {"id": "dates", "kind": "text", "label": "Dates", "group": "The basics", "value": "Fri 14 - Sun 16 Nov", "placeholder": "e.g. 14-16 Nov"},
     {"id": "people", "kind": "slider", "label": "Travellers", "group": "The basics", "min": 1, "max": 10, "step": 1, "value": 2},
     {"id": "budget", "kind": "slider", "label": "Budget per person", "group": "The basics", "min": 5000, "max": 60000, "step": 1000, "value": 15000, "unit": "₹", "ends": ["Shoestring", "Splurge"]},
     {"id": "pace", "kind": "radio", "label": "Pace", "group": "Your style", "value": "easy", "options": [
       {"value": "easy", "label": "Easy", "note": "Beach, long lunches, an early night"},
       {"value": "full", "label": "Full", "note": "Forts, markets and a night out"}]},
     {"id": "likes", "kind": "checkbox", "label": "Interests", "group": "Your style", "value": ["Beaches", "Food"],
      "options": ["Beaches", "Food", "Heritage", "Nightlife", "Water sports"]},
     {"id": "extra", "kind": "text", "label": "Must-dos or no-gos", "multiline": true, "value": "None"}
   ]}
   ```
2. **Photos:** call `find_photos` for the destination (and for 1-2 key places if it helps). Keep the board id from
   the tag it returns. Photo URLs may only come from what `find_photos` returned; never write one yourself.
3. **Facts:** use web search for opening hours, travel times and prices. Leave out what you can't find.
4. **Lay it out** with one `show_blocks` call, in this order:
   - a `heading` with the place and dates;
   - the photo strip via `{"type": "include", "id": "<find_photos id>"}`;
   - `tiles` of 4-8 places to pick, each with an `ask` like "Add Gion to day 2" (an `icon`, and an `image` only if
     find_photos returned that URL);
   - the plan: one `timeline` with a group per day for trips up to 4 days; for longer trips, `tabs` with one tab per
     day (up to 6), each holding that day's `timeline`;
   - a budget `calculator`: travel, stay per night, food per day, activities, nights and people → total and per
     person. Prefill values from search or the user; never do this maths in text;
   - a packing `checklist`, grouped (Clothes, Papers, Gear);
   - one `callout` (tone `tip`) with the single tip that matters most (book early, a closed day, the weather);
   - `actions` with up to 3 next steps;
   - a `source` line if you searched.
5. **Reply** with one or two sentences, then the tag on its own line.

## Layout example (3 days in Kyoto for 2)

The include id is a placeholder; use the one find_photos returned. Numbers come from search or the user.

```json
[
  {"type": "heading", "text": "Kyoto · 3 days · 9-11 Oct"},
  {"type": "include", "id": "4b1e7c20"},
  {"type": "tiles", "items": [
    {"title": "Fushimi Inari", "subtitle": "Gates at sunrise", "icon": "walk", "ask": "Add Fushimi Inari to day 1"},
    {"title": "Arashiyama", "subtitle": "Bamboo grove", "icon": "leaf", "ask": "Add Arashiyama to day 2"},
    {"title": "Gion", "subtitle": "Evening walk", "icon": "moon", "ask": "Add a Gion walk to day 2"},
    {"title": "Nishiki Market", "subtitle": "Street food", "icon": "food", "ask": "Add Nishiki Market to day 3"}
  ]},
  {"type": "timeline", "title": "Plan", "groups": [
    {"label": "Day 1 · Fri 9 Oct", "items": [
      {"time": "07:00", "title": "Fushimi Inari", "icon": "walk", "note": "Go early; crowds by 9."},
      {"time": "12:30", "title": "Lunch at Nishiki Market", "icon": "food"},
      {"time": "16:00", "title": "Check in", "place": "Shijo", "icon": "bed"}
    ]},
    {"label": "Day 2 · Sat 10 Oct", "items": [
      {"time": "08:30", "title": "Arashiyama", "icon": "leaf"},
      {"time": "18:00", "title": "Gion walk", "icon": "moon"}
    ]},
    {"label": "Day 3 · Sun 11 Oct", "items": [
      {"time": "09:00", "title": "Kiyomizu-dera", "icon": "pin"},
      {"time": "15:00", "title": "Train to Osaka", "icon": "plane"}
    ]}
  ]},
  {"type": "calculator", "inputs": [
    {"id": "travel", "label": "Travel per person", "min": 0, "max": 100000, "step": 1000, "value": 42000, "unit": "₹"},
    {"id": "stay", "label": "Stay per night", "min": 0, "max": 30000, "step": 500, "value": 9000, "unit": "₹"},
    {"id": "food", "label": "Food per person per day", "min": 0, "max": 10000, "step": 250, "value": 3000, "unit": "₹"},
    {"id": "fun", "label": "Activities per person", "min": 0, "max": 30000, "step": 500, "value": 5000, "unit": "₹"},
    {"id": "nights", "label": "Nights", "min": 1, "max": 14, "step": 1, "value": 3},
    {"id": "people", "label": "People", "min": 1, "max": 8, "step": 1, "value": 2}
  ], "outputs": [
    {"label": "Total", "formula": "people * (travel + food * (nights + 1) + fun) + stay * nights", "unit": "₹"},
    {"label": "Per person", "formula": "round((people * (travel + food * (nights + 1) + fun) + stay * nights) / people, 0)", "unit": "₹"}
  ]},
  {"type": "checklist", "title": "Packing", "items": [
    {"text": "Passport and visa", "group": "Papers"},
    {"text": "Hotel bookings", "group": "Papers"},
    {"text": "Light jacket", "group": "Clothes"},
    {"text": "Walking shoes", "group": "Clothes"},
    {"text": "Power adapter (type A)", "group": "Gear"},
    {"text": "IC card for trains", "group": "Gear"}
  ]},
  {"type": "callout", "tone": "tip", "title": "The one tip", "text": "Reach Fushimi Inari before 8; by 10 the lower gates are packed."},
  {"type": "actions", "items": [
    {"label": "Find hotels", "run": "Find 3 hotels near Shijo for 9-11 Oct"},
    {"label": "Add a day", "run": "Add a fourth day to my Kyoto trip"},
    {"label": "Cheaper plan", "run": "Make my Kyoto trip cheaper"}
  ]},
  {"type": "source", "text": "japan-guide.com · Kyoto city transport"}
]
```

## Rules

- Blocks only: never write HTML or use `::preview` for a trip plan.
- Numbers (prices, times, distances) only from tools, search or the user. Photo URLs only from `find_photos`;
  `show_blocks` refuses any other. With no photos, use tiles with icons.
- Tabs need 2-6 tabs and go at the top level; for more than 6 days, split by part of the trip ("Days 1-3").
- Money: set `"unit": "₹"` (or the currency) on every money chart, kpi and calculator output; table cells "₹44,500".
- `tiles` take 2-8 items; `actions` up to 3. Button and tile texts never start with `/`, `@` or `!`.
- Keep words short around the tag; don't repeat the plan in text.
