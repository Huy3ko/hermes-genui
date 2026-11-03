---
name: learn
description: "Learn or revise a topic with blocks: flash cards, a checklist of subtopics, progress on cards mastered. Use for teach me, help me revise, study, flash cards, quiz me, exam prep."
version: 0.1.0
platforms: [linux, macos, windows]
---
# Learn

Use this when someone wants to learn, revise or be quizzed on a topic: exam prep, a new skill, a chapter. For one
quick question, just answer in text.

## Steps

1. **Ask first.** When two or more of the level (school, college, work), how deep to go, the exam date and the parts
   to cover are unknown, call `show_blocks` with ONE `form` and nothing else, every field prefilled with your best
   guess, and stop. The user's answer comes back as a message starting `Form: <title> (<id>)`, one `Label: value`
   line per field; build from it. Skip it for a clear ask ("10 cards on the Calvin cycle for class 11"). For "help me
   revise photosynthesis" (a snippet, not the layout):

   ```text
   {"type": "form", "id": "revise", "title": "Photosynthesis: how should we revise?", "submit": "Make my cards", "fields": [
     {"id": "level", "kind": "radio", "label": "Level", "value": "school", "options": [
       {"value": "school", "label": "School", "note": "Class 10-12 boards"},
       {"value": "college", "label": "College", "note": "First-year biology"},
       {"value": "curious", "label": "Just curious"}]},
     {"id": "depth", "kind": "slider", "label": "How deep", "min": 1, "max": 5, "step": 1, "value": 3, "ends": ["Basics", "Exam-ready"]},
     {"id": "parts", "kind": "checkbox", "label": "Cover", "value": ["Light reactions", "Calvin cycle"],
      "options": ["Light reactions", "Calvin cycle", "Factors affecting rate", "C3, C4 and CAM"]},
     {"id": "exam", "kind": "text", "label": "Exam date", "value": "Not fixed yet", "placeholder": "e.g. 3 March"}
   ]}
   ```
2. **Scope it.** From the answer (or the ask), set the level and depth; if you still guessed, say so in a line.
3. **Check the facts.** For anything dated, technical or numeric, use web search. Never invent a date, figure or
   quote; drop a card you can't back up.
4. **Lay it out** with one `show_blocks` call:
   - a `heading` with the topic;
   - a `progress` block "Cards mastered" (value = cards the user said they know, goal = cards in the set) only if
     the user tracks it or told you a score;
   - one `flip` block with 8-12 cards: a short question on the front, a short answer on the back. Mix
     definitions, "why" questions and one or two tricky ones;
   - a `checklist` of the subtopics to cover, in learning order (`numbered: true`);
   - `actions`: "Quiz me again", "Go deeper on <subtopic>", and one more if it helps.
5. **Reply** with one sentence (how to use the cards), then the tag on its own line.
6. **Next round.** When the user says which cards they got, update the `progress` value and make new cards for
   the ones they missed.

## Layout example (revising photosynthesis)

```json
[
  {"type": "heading", "text": "Photosynthesis · revision"},
  {"type": "progress", "title": "Cards mastered", "value": 3, "goal": 10, "unit": "cards",
   "steps": [{"label": "Half", "at": 5}, {"label": "All", "at": 10}]},
  {"type": "flip", "title": "Flash cards", "cards": [
    {"front": "Where does photosynthesis happen?", "back": "In chloroplasts, mostly in leaf cells"},
    {"front": "What are the inputs?", "back": "Carbon dioxide, water and light"},
    {"front": "What are the outputs?", "back": "Glucose and oxygen"},
    {"front": "Which pigment absorbs the light?", "back": "Chlorophyll"},
    {"front": "Light reactions happen where?", "back": "In the thylakoid membranes"},
    {"front": "The Calvin cycle happens where?", "back": "In the stroma"},
    {"front": "Where does the oxygen come from?", "back": "From splitting water, not from CO₂"},
    {"front": "Which enzyme fixes CO₂?", "back": "RuBisCO"},
    {"front": "What do light reactions make for the Calvin cycle?", "back": "ATP and NADPH"},
    {"front": "Why are most leaves green?", "back": "Chlorophyll reflects green light"}
  ]},
  {"type": "checklist", "title": "Subtopics", "numbered": true, "items": [
    "Overall equation",
    "Chloroplast structure",
    "Light reactions",
    "Calvin cycle",
    "Factors: light, CO₂, temperature",
    "C3, C4 and CAM plants"
  ]},
  {"type": "actions", "items": [
    {"label": "Quiz me again", "run": "Quiz me again on photosynthesis, new cards"},
    {"label": "Go deeper", "run": "Go deeper on the Calvin cycle"},
    {"label": "Practice questions", "run": "Give me 5 exam questions on photosynthesis"}
  ]}
]
```

## Rules

- Blocks only: never write HTML or use `::preview` for flash cards or quizzes.
- Facts, numbers and photo URLs only from tools, search or the user. A card's `image` must be a URL `find_photos`
  returned; otherwise leave it out.
- A `flip` holds 2-12 cards; for more, add a second `flip` with its own title. `actions` take up to 3, and their
  text never starts with `/`, `@` or `!`.
- Never invent the user's score; leave `progress` out until they tell you.
- Keep words short around the tag; the cards carry the content.
