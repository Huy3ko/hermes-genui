"""save_recipe: checks a new recipe (a skill that lays out blocks) and hands it to Hermes's own skill_manage, so
Hermes's write approval, agent-created-skill guard and file handling all apply. The plugin never writes skill files
itself. A recipe can only compose existing block types; new components need code.
"""

import json
import re
from collections.abc import Callable

from ..core.check import check_blocks
from ..core.recipes import frontmatter, shipped

# The recipes shipped in the plugin's own recipes/ folder (read-only plugin skills); a saved recipe may not take one of
# their names.
SHIPPED = frozenset(recipe.name for recipe in shipped())
NAME = re.compile(r"^[a-z][a-z0-9-]{2,39}$")
JSON_BLOCK = re.compile(r"```json\n(.*?)\n```", re.DOTALL)
HTML = re.compile(r"<\s*(script|iframe|html|style|object|embed|svg|img|a)\b", re.IGNORECASE)
MAX_CHARS = 12_000
CATEGORY = "my-recipes"

# Set by register(): name, content → skill_manage's JSON result. None outside Hermes.
_skill_writer: Callable[[str, str], str] | None = None


def set_skill_writer(writer: Callable[[str, str], str] | None) -> None:
    global _skill_writer
    _skill_writer = writer


def recipe_problems(name: str, markdown: str) -> list[str]:
    """Everything wrong with a recipe; an empty list means it can be saved.

    ("monthly-review", a recipe whose only JSON example uses type "weather") → ['example 1, 0: unknown type "weather"']
    ("dashboard", …) → ["name: dashboard ships with the plugin; pick another name"]
    """
    if not NAME.match(name or ""):
        return ["name: use 3-40 lowercase letters, digits and dashes, starting with a letter"]
    if name in SHIPPED:
        return [f"name: {name} ships with the plugin; pick another name"]
    if len(markdown) > MAX_CHARS:
        return [f"recipe is too long ({len(markdown):,} characters, max {MAX_CHARS:,})"]
    head = frontmatter(markdown)
    if head is None:
        return ["frontmatter: start with ---, then name: and description: lines, then ---"]
    problems = []
    if head.get("name") != name:
        problems.append(f"frontmatter name must be {name}")
    if not 20 <= len(head.get("description", "")) <= 300:
        problems.append("description: one line of 20-300 characters saying when to use the recipe")
    if "::preview" in markdown:
        problems.append("recipes draw with blocks only; remove ::preview")
    if HTML.search(markdown):
        problems.append("recipes can't contain HTML tags")
    examples = JSON_BLOCK.findall(markdown)
    if not examples:
        problems.append("add one JSON layout example in a ```json fence")
    for i, text in enumerate(examples, start=1):
        try:
            blocks = json.loads(text)
        except json.JSONDecodeError:
            problems.append(f"example {i}: not valid JSON")
            continue
        blocks = blocks if isinstance(blocks, list) else [blocks]
        problems += [f"example {i}, {p}" for p in check_blocks(blocks)]
    return problems


def save_recipe(params: dict, **kwargs) -> str:
    del kwargs
    name = str(params.get("name") or "").strip()
    markdown = str(params.get("markdown") or "")
    problems = recipe_problems(name, markdown)
    if problems:
        return "Not saved. Fix these and call save_recipe again:\n" + "\n".join(f"- {p}" for p in problems)
    if _skill_writer is None:
        return "Not saved: this Hermes can't save skills from a plugin (save_recipe needs skill_manage)."
    result = _skill_writer(name, markdown)
    return (f"Recipe {name} checked and handed to Hermes (category {CATEGORY}). Hermes result: {result}\n"
            "If it says staged, tell the user to approve it (Hermes asks before saving skills); it works from "
            "their next new session.")


SAVE_RECIPE_SCHEMA = {
    "name": "save_recipe",
    "description": (
        "Save a new recipe: a skill that tells you how to lay out a kind of answer with blocks (for example a "
        "monthly investment review). Use only when the user asks to make or save a recipe. The markdown is a full "
        "SKILL.md: frontmatter (name, description), when to use, numbered steps (which tools to call), one ```json "
        "layout example using existing block types only, and rules. The example is checked like show_blocks. "
        "Hermes asks the user to approve before it is saved."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "name": {"type": "string", "description": "lowercase-with-dashes, e.g. monthly-review"},
            "markdown": {"type": "string", "description": "The full SKILL.md text."},
        },
        "required": ["name", "markdown"],
    },
}
