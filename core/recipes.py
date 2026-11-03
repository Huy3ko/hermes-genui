"""The recipes that ship in the plugin's recipes/ folder: one folder per recipe, holding its SKILL.md.

register() hands each one to Hermes as a read-only plugin skill, which the model loads by its namespaced name,
skill_view("<plugin>:<recipe>"). Recipes the user makes are not here: save_recipe hands them to Hermes's skill_manage,
which keeps them in the profile's own skills (category my-recipes).

    recipes/trip-planner/SKILL.md → Recipe("trip-planner", <that path>, "Plan a trip with blocks: …")
"""

from dataclasses import dataclass
from pathlib import Path

RECIPES_DIR = Path(__file__).resolve().parent.parent / "recipes"


@dataclass(frozen=True)
class Recipe:
    """One shipped recipe: its name (the folder's), its SKILL.md and the one-line description from its frontmatter."""

    name: str
    path: Path
    description: str


def frontmatter(markdown: str) -> dict[str, str] | None:
    """The `key: value` lines between the first two `---` fences, or None when there are none.

    '---\\nname: x\\ndescription: "A b c"\\n---\\nbody' → {"name": "x", "description": "A b c"}
    """
    if not markdown.startswith("---\n"):
        return None
    end = markdown.find("\n---", 4)
    if end < 0:
        return None
    fields = {}
    for line in markdown[4:end].splitlines():
        key, sep, value = line.partition(":")
        if sep and key.strip():
            fields[key.strip()] = value.strip().strip('"').strip("'")
    return fields


def shipped(root: Path = RECIPES_DIR) -> list[Recipe]:
    """Every folder under `root` that holds a SKILL.md, by name. A folder without one (or a loose file such as
    DESCRIPTION.md) is not a recipe.

    recipes/{compare/SKILL.md, trip-planner/SKILL.md, notes/} → [Recipe("compare", …), Recipe("trip-planner", …)]
    """
    found = []
    for folder in sorted(p for p in root.iterdir() if p.is_dir()):
        skill = folder / "SKILL.md"
        if skill.is_file():
            head = frontmatter(skill.read_text(encoding="utf-8")) or {}
            found.append(Recipe(folder.name, skill, head.get("description", "")))
    return found
