"""Every layout example in a recipe skill must be valid blocks, so the model never copies a broken one."""

import importlib
import json
import re

import pytest

from conftest import ROOT, load_plugin_package

load_plugin_package()
check_blocks = importlib.import_module("hermes_genui.core.check").check_blocks

RECIPES = sorted((ROOT / "recipes").glob("*/SKILL.md"))
JSON_BLOCK = re.compile(r"```json\n(.*?)\n```", re.DOTALL)


def test_there_are_recipes():
    assert RECIPES


@pytest.mark.parametrize("recipe", RECIPES, ids=lambda p: p.parent.name)
def test_recipe_examples_are_valid_blocks(recipe):
    text = recipe.read_text(encoding="utf-8")
    examples = JSON_BLOCK.findall(text)
    assert examples, "a recipe shows at least one layout"
    for example in examples:
        assert check_blocks(json.loads(example)) == []


@pytest.mark.parametrize("recipe", RECIPES, ids=lambda p: p.parent.name)
def test_recipe_has_name_and_description(recipe):
    head = recipe.read_text(encoding="utf-8").split("---")[1]
    assert re.search(r"^name: \S+", head, re.M)
    assert re.search(r"^description: .{20,}", head, re.M)


@pytest.mark.parametrize("recipe", RECIPES, ids=lambda p: p.parent.name)
def test_recipe_frontmatter_is_complete(recipe):
    head = recipe.read_text(encoding="utf-8").split("---")[1]
    assert re.search(r'^description: ".{20,}"$', head, re.M), "description is one quoted line"
    assert re.search(r"^version: \d+\.\d+\.\d+$", head, re.M)
    assert re.search(r"^platforms: \[.+\]$", head, re.M)
    assert re.search(rf"^name: {re.escape(recipe.parent.name)}$", head, re.M), "name matches the folder"


@pytest.mark.parametrize("recipe", RECIPES, ids=lambda p: p.parent.name)
def test_recipe_rules_forbid_html(recipe):
    rules = recipe.read_text(encoding="utf-8").split("## Rules", 1)[-1]
    assert "::preview" in rules, "the rules say blocks only, never HTML or ::preview"


TEXT_BLOCK = re.compile(r"```text\n(.*?)\n[ \t]*```", re.DOTALL)  # a fence in a list item is indented
ASKS_FIRST = ("trip-planner", "what-if", "learn", "tracker")


# explain shows one layout per kind of stage it teaches (a flow, a simulation); every other recipe shows one.
LAYOUT_EXAMPLES = {"explain": 2}


@pytest.mark.parametrize("recipe", RECIPES, ids=lambda p: p.parent.name)
def test_recipe_has_exactly_one_layout_example(recipe):
    examples = JSON_BLOCK.findall(recipe.read_text(encoding="utf-8"))
    assert len(examples) == LAYOUT_EXAMPLES.get(recipe.parent.name, 1)


def _forms_in(text: str) -> list[dict]:
    """The form blocks a recipe shows, in its ```json layout or as a ```text snippet."""
    found = []
    for snippet in JSON_BLOCK.findall(text) + TEXT_BLOCK.findall(text):
        try:
            blocks = json.loads(snippet)
        except json.JSONDecodeError:
            continue
        for block in blocks if isinstance(blocks, list) else [blocks]:
            if isinstance(block, dict) and block.get("type") == "form":
                found.append(block)
    return found


@pytest.mark.parametrize("name", ASKS_FIRST)
def test_recipe_asks_first_with_one_prefilled_form(name):
    text = (ROOT / "recipes" / name / "SKILL.md").read_text(encoding="utf-8")
    steps = text.split("## Steps", 1)[1]
    assert steps.lstrip().startswith("1. **Ask first.**"), "the first step is Ask first"
    forms = _forms_in(text)
    assert len(forms) == 1, "one example form"
    form = forms[0]
    assert check_blocks([form]) == []
    assert form.get("id") and form.get("title")
    assert len(form["fields"]) >= 3
    for field in form["fields"]:
        assert "value" in field, f'{field["id"]} is prefilled with a best guess'


def test_dashboard_recipe_says_to_ask_with_one_form_first():
    text = (ROOT / "recipes" / "dashboard" / "SKILL.md").read_text(encoding="utf-8")
    assert "if key inputs are unknown, ask with one form first" in text.lower()


def test_compare_shows_cards_and_one_line_not_a_bar_chart_per_metric():
    text = (ROOT / "recipes" / "compare" / "SKILL.md").read_text(encoding="utf-8")
    tabs = next(block for block in json.loads(JSON_BLOCK.findall(text)[0]) if block["type"] == "tabs")
    compare = next(tab for tab in tabs["tabs"] if tab["label"] == "Compare")["children"]
    assert [block["type"] for block in compare] == ["kpis", "table", "chart"]
    assert compare[2]["kind"] == "line" and compare[2]["unit"] == "%"
    assert all("trend" in item for item in compare[0]["items"])


SENTENCE_END = re.compile(r"[.!?](?:\s|$)")


def _walk(blocks: list) -> list[dict]:
    """Every block, containers' children included."""
    out = []
    for block in blocks:
        out.append(block)
        out += _walk(block.get("children", []))
    return out


def test_explain_follows_one_case_through_a_flow_that_changes_at_every_step():
    text = (ROOT / "recipes" / "explain" / "SKILL.md").read_text(encoding="utf-8")
    head, steps = text.split("---")[1], text.split("## Steps", 1)[1]
    for trigger in ("explain", "how does X work", "walk me through", "what happens when"):
        assert trigger in head, trigger
    assert not steps.lstrip().startswith("1. **Ask first.**"), "explain guesses the level instead of asking"
    blocks = _walk(json.loads(JSON_BLOCK.findall(text)[0]))
    kinds = [block["type"] for block in blocks]
    assert "flip" not in kinds and "list" in kinds, "a short list of terms, no flash cards by default"
    assert kinds.index("flow") < kinds.index("steps") < kinds.index("layers") < kinds.index("actions")
    flow = next(block for block in blocks if block["type"] == "flow")
    walk = next(block for block in blocks if block["type"] == "steps")
    assert walk["for"] == flow["id"] and 4 <= len(flow["nodes"]) <= 8
    assert all(node.get("holds") for node in flow["nodes"]) and flow["groups"][0]["count"] == 6
    assert 4 <= len(walk["items"]) <= 8
    node_ids = {node["id"] for node in flow["nodes"]}
    for item in walk["items"]:
        assert item["node"] in node_ids and set(item.get("holds", {})) <= node_ids
        assert len(SENTENCE_END.findall(item["text"])) <= 2, item["title"]
    still = [item for item in walk["items"] if not (item.get("holds") or item.get("send") or item.get("tick"))]
    assert len(still) <= 1, "every step but the first changes the stage"
    assert any(item.get("tick") for item in walk["items"]) and any(item.get("send") for item in walk["items"])
    assert any(block.get("text") == "numbers illustrative" for block in blocks), "made-up numbers are labelled"
    labels = [item["label"] for item in next(block for block in blocks if block["type"] == "actions")["items"]]
    assert labels[1:] == ["Quiz me", "Simpler"] and labels[0].startswith("Go deeper on")
    assert any(block.get("label") == "More technical" for block in blocks)


def test_explain_shows_a_quantity_over_time_as_a_simulation_and_keeps_formulas_in_the_text():
    text = (ROOT / "recipes" / "explain" / "SKILL.md").read_text(encoding="utf-8")
    examples = JSON_BLOCK.findall(text)
    kinds = [block["type"] for block in _walk(json.loads(examples[1]))]
    assert "simulate" in kinds and "flow" not in kinds
    assert "$$" in text and not any("$" in example for example in examples), "formulas go in the reply text"


def test_recipe_builder_saves_new_recipes_and_leaves_the_shipped_ones_alone():
    text = (ROOT / "recipes" / "recipe-builder" / "SKILL.md").read_text(encoding="utf-8")
    assert "save_recipe" in text and "skill_manage" not in text, "new recipes go through save_recipe"
    assert "Don't copy or replace the recipes that ship with the plugin" in text
    assert "skills/" not in text, "no install location to copy into"


@pytest.mark.parametrize("recipe", RECIPES, ids=lambda p: p.parent.name)
def test_recipes_name_no_install_location(recipe):
    # Recipes are plugin skills now, loaded by name; nothing is copied into the profile's skills folder.
    text = recipe.read_text(encoding="utf-8")
    assert "blocks-recipes" not in text and "~/.hermes/skills" not in text
