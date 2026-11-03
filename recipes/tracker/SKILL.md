---
name: tracker
description: "Track habits and goals with blocks: current streak, a weeks-by-days heatmap, progress to the goal, buttons to log today. Use for habit tracker, streak, goal progress, how am I doing on, log my run, workouts, reading, meditation."
version: 0.1.0
platforms: [linux, macos, windows]
---
# Tracker

Use this when someone tracks a habit or a goal (running, reading, meditation, no sugar, savings) and wants to see
how they are doing, or logs a day. For a money goal with what-if maths, use `what-if`.

## Steps

1. **Ask first.** For a new tracker, when two or more of the habit, what to count, the goal and the days a week are
   unknown, call `show_blocks` with ONE `form` and nothing else, every field prefilled with your best guess, and
   stop. The user's answer comes back as a message starting `Form: <title> (<id>)`, one `Label: value` line per
   field; build from it. Never ask for history in a form, and skip it when logging a day. For "help me track my
   running" (a snippet, not the layout):

   ```text
   {"type": "form", "id": "new-tracker", "title": "Set up your tracker", "submit": "Start tracking", "fields": [
     {"id": "habit", "kind": "text", "label": "Habit", "value": "Morning run", "placeholder": "e.g. read 20 pages"},
     {"id": "count", "kind": "radio", "label": "What to count", "value": "km", "options": [
       {"value": "done", "label": "Done or not", "note": "A tick a day"},
       {"value": "km", "label": "Kilometres"},
       {"value": "minutes", "label": "Minutes"}]},
     {"id": "days", "kind": "slider", "label": "Days a week", "min": 1, "max": 7, "step": 1, "value": 4, "ends": ["Easy", "Every day"]},
     {"id": "goal", "kind": "slider", "label": "Goal for the month", "min": 10, "max": 300, "step": 10, "value": 80, "unit": "km"}
   ]}
   ```
2. **Get the history** from what the user told you in this chat or from memory. Never invent a day, a count or a
   past week. If you have no history, draw an empty start (streak 0, today marked) and say so.
3. **Work out** the current streak (days in a row up to today), this week's days, and the total toward the goal.
   Count only days the user reported.
4. **Lay it out** with one `show_blocks` call:
   - a `heading` with the habit;
   - a `streak` with the count and this week's 7 days (`done` for logged days, `today: true` on today);
   - a `heatmap` of the last weeks (rows, up to 12) by Mon-Sun (cols), `scale: "sequential"`: 1 for done, 0 for
     missed, a number for amounts (minutes, km, pages), `null` for days not yet here or not known;
   - a `progress` toward the goal, with up to 6 `steps` as checkpoints;
   - a `list` of the top items (longest runs, best weeks, books finished), `ranked: true`;
   - `actions` to log today: "Done today", "Missed today", and one with an amount if it fits.
5. **Reply** with one sentence (an honest nudge, not a lecture), then the tag on its own line.
6. **When the user logs**, add it to what you know (memory if available) and redraw the board.

## Layout example (a running habit the user has logged for 5 weeks)

```json
[
  {"type": "heading", "text": "Morning runs"},
  {"type": "streak", "count": 4, "label": "Current streak", "unit": "days", "days": [
    {"label": "Mon", "done": true},
    {"label": "Tue", "done": true},
    {"label": "Wed", "done": true},
    {"label": "Thu", "done": true},
    {"label": "Fri", "today": true},
    {"label": "Sat"},
    {"label": "Sun"}
  ]},
  {"type": "heatmap", "title": "Km per day", "unit": "km", "scale": "sequential",
   "rows": ["Wk 5 Oct", "Wk 12 Oct", "Wk 19 Oct", "Wk 26 Oct", "Wk 2 Nov"],
   "cols": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
   "values": [
     [3, 0, 4, 0, 3, 6, 0],
     [3, 3, 0, 4, 0, 8, 0],
     [0, 4, 4, 0, 3, 7, 0],
     [4, 3, 0, 5, 4, 0, 0],
     [3, 4, 5, 3, null, null, null]
   ]},
  {"type": "progress", "title": "October-November goal", "value": 83, "goal": 150, "unit": "km",
   "steps": [{"label": "50 km", "at": 50}, {"label": "100 km", "at": 100}, {"label": "150 km", "at": 150}]},
  {"type": "list", "title": "Best runs", "ranked": true, "items": [
    {"title": "Long run", "subtitle": "Sat 17 Oct", "value": "8 km", "icon": "trophy"},
    {"title": "Long run", "subtitle": "Sat 24 Oct", "value": "7 km", "icon": "star"},
    {"title": "Long run", "subtitle": "Sat 10 Oct", "value": "6 km", "icon": "walk"}
  ]},
  {"type": "actions", "items": [
    {"label": "Ran today", "run": "Log today's run"},
    {"label": "Rest day", "run": "Log today as a rest day"},
    {"label": "Week summary", "run": "Summarise my running this week"}
  ]}
]
```

## Rules

- Blocks only: never write HTML or use `::preview` for a tracker.
- Numbers only from what the user told you, memory or tools; never fill in history. Unknown days are `null`.
  Photo URLs only from `find_photos`.
- A heatmap holds up to 12 rows and 12 columns, each row with a value per column. A streak shows up to 7 days.
  `actions` take up to 3; their text never starts with `/`, `@` or `!`.
- No medical or diet advice beyond what the user asked.
- Keep words short around the tag; the board shows the numbers.
