"""simulate: a formula played over time. Sliders and fixed values feed 1-3 formulas of time; Hermes Desktop plays them
as piles of dots or a line that draws itself. Off Desktop it reads as a small table at five points in time.

It is the calculator with time added, so names follow the calculator's rules and formulas use its helpers.
"""

import math
import re

from .calculator import FORMULA_HELPERS, INPUT_ID, _range_ok, arithmetic, formula_problem
from .common import first_of, fmt_num, has_text, is_number, md_table, safe_text, short_text, table_cell, with_unit

MAX_INPUTS, MAX_VALUES, MAX_PILES, MAX_STEPS = 4, 8, 3, 1000
# The longest a title, a time or value unit, a source line, a pile's or input's name and a pile's "adds" may be.
TITLE, UNIT, SOURCE, NAME = 80, 12, 120, 40
VIEWS = ("dots", "chart")
T_RULE = "t needs a name, to > 0 and step > 0"
ROWS = 5  # the text table's points in time


def _is_name(value: object) -> bool:
    return isinstance(value, str) and re.fullmatch(INPUT_ID, value) is not None


def check_simulate(block: dict, path: str) -> list[tuple[str, str]]:
    """A time `t` ({name, to, step, unit, speed}), up to 4 sliders, up to 8 fixed values and a view of 1-3 piles, each
    a formula of those names. Every name is used once and is not a helper's; every formula uses only them.

    t = {"name": "years", "to": 0} → [("0.t", "t needs a name, to > 0 and step > 0")]
    a pile with formula "P * q" (no q) → [("0.view.piles.0", 'formula uses "q", which is not t, an input or a value')]
    """
    problems = [(path, why) for why in _extras_problems(block)]
    t_problem, names = _check_time(block.get("t"))
    if t_problem:
        return [*problems, (f"{path}.t", t_problem)]
    inputs = block.get("inputs", [])
    if not isinstance(inputs, list) or len(inputs) > MAX_INPUTS:
        return [*problems, (path, f"simulate takes at most {MAX_INPUTS} inputs")]
    values = block.get("values", {})
    values_problem = _values_problem(values, names)
    if values_problem:
        return [*problems, (f"{path}.values", values_problem)]
    names |= set(values)
    for i, item in enumerate(inputs):
        why = _input_problem(item, names)
        if why:
            problems.append((f"{path}.inputs.{i}", why))
    return problems + _check_view(block.get("view"), f"{path}.view", names)


def _extras_problems(block: dict) -> list[str]:
    """The block's own short texts: title, unit and source."""
    limits = (("title", TITLE), ("unit", UNIT), ("source", SOURCE))
    return [f"{key} is text of at most {most} characters" for key, most in limits
            if not short_text(block.get(key), most)]


def _check_time(t: object) -> tuple[str | None, set[str]]:
    """The time's problem (or None) and the names it brings (its own).

    {"name": "years", "to": 30, "step": 1} → (None, {"years"})
    {"name": "years", "to": 5000} → ("t takes at most 1000 steps", set())
    """
    if not isinstance(t, dict) or not _is_name(t.get("name")):
        return T_RULE, set()
    name, to, step = t["name"], t.get("to"), t.get("step", 1)
    if name in FORMULA_HELPERS:
        return f't name "{name}" is a helper\'s name', set()
    if not (is_number(to) and is_number(step) and to > 0 and step > 0):
        return T_RULE, set()
    if to / step > MAX_STEPS:
        return f"t takes at most {MAX_STEPS} steps", set()
    if t.get("speed") is not None and not (is_number(t["speed"]) and t["speed"] > 0):
        return "speed is a number above 0", set()
    if not short_text(t.get("unit"), UNIT):
        return f"unit is text of at most {UNIT} characters", set()
    return None, {name}


def _values_problem(values: object, names: set[str]) -> str | None:
    """Fixed numbers the formulas use: {"P": 100000}. At most 8, each a new name that isn't a helper's."""
    if not isinstance(values, dict) or not all(_is_name(k) and is_number(v) for k, v in values.items()):
        return 'values maps names to numbers: {"P": 100000}'
    if len(values) > MAX_VALUES:
        return f"at most {MAX_VALUES} values"
    for key in values:
        if key in FORMULA_HELPERS:
            return f'name "{key}" is a helper\'s name'
        if key in names:
            return f'name "{key}" is already a name'
    return None


def _input_problem(item: object, names: set[str]) -> str | None:
    """One slider, as the calculator's but named by `name` (also `id`). Adds its name to `names`.

    {"name": "rate", "min": 6, "max": 14} → None;  {"name": "P"} with a value P → 'name "P" is used twice'
    """
    if not isinstance(item, dict):
        return "input is not an object"
    name = item.get("name", item.get("id"))
    if not _is_name(name):
        return 'input needs a name like "rate"'
    if name in FORMULA_HELPERS:
        return f'name "{name}" is a helper\'s name'
    if name in names:
        return f'name "{name}" is used twice'
    names.add(name)
    if not short_text(item.get("label"), NAME) or not short_text(item.get("unit"), UNIT):
        return f"label is text of at most {NAME} characters, unit of at most {UNIT}"
    if not _range_ok(item):
        return "input's max must be above its min"
    return None


def _check_view(view: object, path: str, names: set[str]) -> list[tuple[str, str]]:
    """kind dots or chart, per (what one dot stands for) above 0, a short start label and 1-3 piles (also `series`),
    each a short name, a formula of the names and an optional short `adds` (what that pile adds over the one before).
    """
    if not isinstance(view, dict):
        return [(path, "view needs 1-3 piles")]
    if view.get("kind", "dots") not in VIEWS:
        return [(path, 'kind is "dots" or "chart"')]
    if view.get("per") is not None and not (is_number(view["per"]) and view["per"] > 0):
        return [(path, "per is a number above 0")]
    if not short_text(view.get("start"), NAME):
        return [(path, f"start is text of at most {NAME} characters")]
    piles = view.get("piles", view.get("series"))
    if not isinstance(piles, list) or not 1 <= len(piles) <= MAX_PILES:
        return [(path, f"view needs 1-{MAX_PILES} piles")]
    problems = []
    for i, pile in enumerate(piles):
        here = f"{path}.piles.{i}"
        if not isinstance(pile, dict) or not has_text(pile.get("name")) or not short_text(pile["name"], NAME) \
                or not has_text(pile.get("formula")):
            problems.append((here, f"pile needs a name of at most {NAME} characters and a formula"))
        elif not short_text(pile.get("adds"), NAME):
            problems.append((here, f"adds is text of at most {NAME} characters"))
        elif why := formula_problem(pile["formula"], names):
            problems.append((here, why))
    return problems


def _amount(v: float) -> str:
    """A worked-out amount, rounded for reading: 214358.88 → "214,359";  12.3456 → "12.35";  0.004567 → "0.00457"."""
    return fmt_num(round(v)) if abs(v) >= 100 else fmt_num(round(v, 2) if abs(v) >= 1 else v)


def _times(to: float, step: float) -> list[float]:
    """Five evenly spaced times from 0 to `to`, each on a step: (30, 1) → [0, 8, 15, 23, 30]."""
    return [math.floor(to * k / (ROWS - 1) / step + 0.5) * step for k in range(ROWS)]


def text_simulate(block: dict) -> str:
    """The title, the sliders at their starting values, then a table of each pile at five times; a pile whose formula
    needs a helper shows "–" (it plays in Hermes Desktop).

    → "**Savings**\\nWith Rate 10%:\\n| years | Simple | Compound |\\n| --- | --- | --- |\\n| 0 | 100,000 ₹ | ..."
    """
    t, view = block.get("t"), block.get("view")
    if not isinstance(t, dict) or not isinstance(view, dict) or not _is_name(t.get("name")):
        return ""
    to, step = t.get("to"), t.get("step", 1)
    piles = view.get("piles", view.get("series"))
    if not (is_number(to) and is_number(step) and to > 0 and step > 0) or not isinstance(piles, list):
        return ""
    piles = [p for p in piles[:MAX_PILES] if isinstance(p, dict) and safe_text(p.get("name"))]
    if not piles:
        return ""
    names = {k: v for k, v in (block.get("values") or {}).items() if _is_name(k) and is_number(v)}
    shown = []
    for item in block.get("inputs") or []:
        if not isinstance(item, dict) or not _is_name(item.get("name", item.get("id"))):
            continue
        start = next((item[k] for k in ("value", "min") if is_number(item.get(k))), 0)
        names[item.get("name", item.get("id"))] = start
        value = with_unit(fmt_num(start), safe_text(item.get("unit"), UNIT))
        shown.append(f"{first_of(item, 'label', 'name', 'id')} {value}")
    unit = safe_text(block.get("unit"), UNIT)
    rows = []
    for when in _times(to, step):
        cells = [arithmetic(p.get("formula"), {**names, t["name"]: when}, powers=True) for p in piles]
        rows.append([fmt_num(when)] + [with_unit(_amount(v), unit) if v is not None else "–" for v in cells])
    header = [table_cell(t.get("unit")) or t["name"]] + [table_cell(p.get("name")) for p in piles]
    title = safe_text(block.get("title"), TITLE)
    lead = ([f"**{title}**"] if title else []) + ([f"With {', '.join(shown)}:"] if shown else [])
    return "\n".join(lead + md_table(header, rows))
