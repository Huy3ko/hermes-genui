"""calculator: sliders for what-if numbers and results worked out from formulas, with an optional live chart."""

import math
import re

from .chart import chart_kind
from .common import MAX_STRING, first_of, fmt_num, has_text, is_number, safe_text, with_unit

# The calculator's formula helpers (the web side's web/src/lib/formula.ts): an input can't share a name with one.
FORMULA_HELPERS = ("min", "max", "round", "abs", "if", "emi", "sip", "pct", "prepay_years", "prepay_interest",
                   "balance", "principal_paid", "interest_paid", "sip_value")
INPUT_ID = r"^[A-Za-z_][A-Za-z0-9_]{0,23}$"


def check_calculator(block: dict, path: str) -> list[tuple[str, str]]:
    """1-6 inputs and up to 6 outputs. An input needs an id formulas can use (not a helper's name, not repeated) and
    a max above its min (missing min is 0; missing max is twice the value, or 100). An output needs a label and a
    formula; whether the formula reads is the web side's call (a bad one shows "–"). A chart, when there is one, is
    checked by _check_calc_chart.

    inputs = [{"id": "emi"}] → [("0.inputs.0", 'input id "emi" is a helper\'s name')]
    inputs = [{"id": "x", "min": 5, "max": 5}] → [("0.inputs.0", "input's max must be above its min")]
    """
    inputs, outputs = block.get("inputs"), block.get("outputs", [])
    if not isinstance(inputs, list) or not 1 <= len(inputs) <= 6:
        return [(path, "calculator needs 1-6 inputs")]
    if not isinstance(outputs, list) or len(outputs) > 6:
        return [(path, "a calculator shows at most 6 outputs")]
    problems, seen = [], set()
    for i, it in enumerate(inputs):
        where = f"{path}.inputs.{i}"
        given = it.get("id") if isinstance(it, dict) else None
        if not isinstance(given, str) or not re.fullmatch(INPUT_ID, given):
            problems.append((where, 'input needs an id like "p" or "rate"'))
        elif given in FORMULA_HELPERS:
            problems.append((where, f'input id "{given}" is a helper\'s name'))
        elif given in seen:
            problems.append((where, f'input id "{given}" is used twice'))
        elif not _range_ok(it):
            problems.append((where, "input's max must be above its min"))
        seen.add(given)
    problems += [
        (f"{path}.outputs.{i}", "output needs a label and a formula")
        for i, it in enumerate(outputs)
        if not (isinstance(it, dict) and has_text(it.get("label")) and has_text(it.get("formula")))
    ]
    if "chart" in block:
        problems += _check_calc_chart(block["chart"], f"{path}.chart", seen)
    return problems


CALC_CHART_KINDS = ("line", "area", "bar")
# A {name} in x's label, where each point's x value is written: "Year {y}" → "Year 3".
PLACEHOLDER = re.compile(r"\{([^{}]*)\}")


def _check_calc_chart(chart: object, path: str, input_ids: set) -> list[tuple[str, str]]:
    """A calculator's live chart: kind line, area or bar (missing is a line); x with a loop name (an identifier, not an
    input's id or a helper's name) and from, to and step, each a number or a formula; a label, when given, names the
    value's place with x's own name; 1-3 series, each with a name and a formula. Formulas aren't read here: one that
    fails leaves gaps on the web side.

    x = {"name": "n", ...} with an input n → [("0.chart.x", 'x name "n" is an input\'s id')]
    x = {"name": "y", "from": 0, "to": "n"} → [("0.chart.x", "x needs from, to and step (numbers or formulas)")]
    x = {"name": "d", ..., "label": "Night {y}"} → [("0.chart.x", "label uses {y} but x is named d; write {d}")]
    """
    if not isinstance(chart, dict):
        return [(path, "chart must be an object")]
    if chart_kind(chart.get("kind", "line")) not in CALC_CHART_KINDS:
        return [(path, "chart kind is line, area or bar")]
    x = chart.get("x") if isinstance(chart.get("x"), dict) else {}
    name = x.get("name")
    if not isinstance(name, str) or not re.fullmatch(INPUT_ID, name):
        return [(f"{path}.x", 'x needs a name like "y"')]
    if name in input_ids:
        return [(f"{path}.x", f'x name "{name}" is an input\'s id')]
    if name in FORMULA_HELPERS:
        return [(f"{path}.x", f'x name "{name}" is a helper\'s name')]
    if not all(is_number(x.get(k)) or has_text(x.get(k)) for k in ("from", "to", "step")):
        return [(f"{path}.x", "x needs from, to and step (numbers or formulas)")]
    label = x.get("label") if isinstance(x.get("label"), str) else ""
    others = [p for p in PLACEHOLDER.findall(label) if p != name]
    if others:
        listed = ", ".join(f"{{{p}}}" for p in others)
        return [(f"{path}.x", f"label uses {listed} but x is named {name}; write {{{name}}}")]
    series = chart.get("series")
    if not isinstance(series, list) or not 1 <= len(series) <= 3:
        return [(path, "chart needs 1-3 series")]
    return [
        (f"{path}.series.{i}", "series needs a name and a formula")
        for i, s in enumerate(series)
        if not (isinstance(s, dict) and has_text(s.get("name")) and has_text(s.get("formula")))
    ]


def _range_ok(item: dict) -> bool:
    """Whether a slider's max is above its min, with the drawing side's defaults.

    {"min": 5, "max": 5} → False;  {"value": 40} → True (0 to 80);  {"min": 200} → False (max defaults to 100)
    """
    low = item.get("min") if is_number(item.get("min")) else 0
    high = item.get("max")
    if not is_number(high):
        value = item.get("value")
        high = value * 2 if is_number(value) and value > 0 else 100
    return high > low


# Only + - * / ( ) (and ^ when asked), numbers and names: anything else (the helpers, comparisons) is left to Hermes
# Desktop.
TOKEN = re.compile(r"\s*(?:([0-9]+(?:\.[0-9]*)?|\.[0-9]+)|([A-Za-z_][A-Za-z0-9_]*)|([-+*/()]))")
POWER_TOKEN = re.compile(r"\s*(?:([0-9]+(?:\.[0-9]*)?|\.[0-9]+)|([A-Za-z_][A-Za-z0-9_]*)|([-+*/()^]))")
MAX_NESTING = 30


def _tokens(formula: str, token: re.Pattern = TOKEN) -> list[str] | None:
    """The formula's tokens, or None when it holds anything else: "p*(1+r)" → ["p", "*", "(", "1", "+", "r", ")"]."""
    out, at = [], 0
    while at < len(formula):
        if formula[at:].isspace():
            break
        match = token.match(formula, at)
        if not match:
            return None
        out.append(match.group(match.lastindex))
        at = match.end()
    return out


def arithmetic(formula: str, names: dict[str, float], powers: bool = False) -> float | None:
    """A simple formula worked out without eval, or None when it isn't one this can read (or divides by zero). With
    `powers`, ^ works too, as on the web side: -2 ^ 2 is -4 and 2 ^ 3 ^ 2 is 512.

    arithmetic("2 + 3 * (4 - 1) / 2", {}) → 6.5;  arithmetic("-x + 1.5", {"x": 1}) → 0.5
    arithmetic("emi(p, r, n)", ...) → None;  arithmetic("x y", ...) → None;  arithmetic("1 / 0", {}) → None
    arithmetic("1.1 ^ 2", {}) → None;  arithmetic("1.1 ^ 2", {}, powers=True) → 1.21;  "(-8) ^ 0.5" → None
    """
    if not isinstance(formula, str) or len(formula) > MAX_STRING:
        return None
    tokens = _tokens(formula, POWER_TOKEN if powers else TOKEN)
    if not tokens:
        return None
    at = 0

    def peek() -> str | None:
        return tokens[at] if at < len(tokens) else None

    def take() -> str:
        nonlocal at
        at += 1
        return tokens[at - 1]

    def expr(depth: int) -> float:
        value = term(depth)
        while peek() in ("+", "-"):
            value = value + term(depth) if take() == "+" else value - term(depth)
        return value

    def term(depth: int) -> float:
        value = unary(depth)
        while peek() in ("*", "/"):
            op = take()
            right = unary(depth)
            value = value * right if op == "*" else value / right
        return value

    def unary(depth: int) -> float:
        if depth > MAX_NESTING:
            raise ValueError("too deep")
        if peek() in ("+", "-"):
            return -unary(depth + 1) if take() == "-" else unary(depth + 1)
        base = atom(depth)
        if peek() == "^":
            take()
            return math.pow(base, unary(depth + 1))
        return base

    def atom(depth: int) -> float:
        part = take() if peek() is not None else None
        if part == "(":
            value = expr(depth + 1)
            if peek() != ")":
                raise ValueError("unclosed (")
            take()
            return value
        if part and (part[0].isdigit() or part[0] == "."):
            return float(part)
        if part in names:
            return float(names[part])
        raise ValueError(f"unexpected {part}")

    try:
        value = expr(0)
    except (ValueError, ZeroDivisionError, OverflowError):  # math.pow raises the first and last
        return None
    if at != len(tokens) or value != value or value in (float("inf"), float("-inf")):
        return None
    return value


def text_calculator(block: dict) -> str:
    """The inputs at their starting values, then each output worked out there; a formula using the helpers (emi, sip,
    ...) or anything beyond + - * / ( ) points to Hermes Desktop instead.

    → "With Price 200 ₹, Qty 3:\n- Total: 708 ₹\n- EMI: open in Hermes Desktop for the live calculator"
    """
    inputs = [it for it in block.get("inputs", [])[:6] if isinstance(it, dict) and isinstance(it.get("id"), str)]
    names: dict[str, float] = {}
    shown = []
    for it in inputs:
        start = next((it[k] for k in ("value", "min") if is_number(it.get(k))), 0)
        names[it["id"]] = start
        label = first_of(it, "label", "id")
        shown.append(f"{label} {with_unit(fmt_num(start), safe_text(it.get('unit'), 20))}")
    lines = []
    for out in block.get("outputs", [])[:6]:
        label = safe_text(out.get("label")) if isinstance(out, dict) else ""
        if not label:
            continue
        value = arithmetic(out.get("formula"), names)
        if value is None:
            lines.append(f"- {label}: open in Hermes Desktop for the live calculator")
        else:
            lines.append(f"- {label}: {with_unit(fmt_num(value), safe_text(out.get('unit'), 20))}")
    if not lines:
        return ""
    return "\n".join(([f"With {', '.join(shown)}:"] if shown else []) + lines)


# What a formula may hold, as the web side reads it (web/src/lib/formula.ts): numbers (1, 8.5, .5, 1e6), names,
# + - * / ^ ( ) , and comparisons.
FORMULA_TOKEN = re.compile(r"\s*(?:((?:[0-9]+\.?[0-9]*|\.[0-9]+)(?:[eE][+-]?[0-9]+)?)|([A-Za-z_][A-Za-z0-9_]*)|"
                           r"(<=|>=|==|!=|[-+*/^(),<>]))")


def formula_problem(formula: object, names: set[str]) -> str | None:
    """What stops a formula being worked out with these names, or None: only numbers, the names, helpers called with
    brackets, + - * / ^ ( ), comparisons and commas, brackets that match, at most 300 characters.

    ("P * (1 + rate / 100) ^ years", {"P", "rate", "years"}) → None;  ("P * q", {"P"}) → 'formula uses "q", ...'
    ("fetch(P)", ...) → 'formula calls "fetch", ...';  ("P.x", ...) → "formula can't be read: ..."
    """
    if not has_text(formula) or len(formula) > MAX_STRING:
        return f"formula is text of at most {MAX_STRING} characters"
    tokens = _tokens(formula, FORMULA_TOKEN)
    if tokens is None:
        return "formula can't be read: only numbers, names, + - * / ^ ( ), comparisons and helpers"
    depth = 0
    for i, part in enumerate(tokens):
        depth += {"(": 1, ")": -1}.get(part, 0)
        if depth < 0:
            break
        if not re.fullmatch(r"[A-Za-z_]\w*", part, flags=re.ASCII):
            continue
        called = i + 1 < len(tokens) and tokens[i + 1] == "("
        if called and part not in FORMULA_HELPERS:
            return f'formula calls "{part}", which is not a helper'
        if not called and part not in names:
            return f'formula uses "{part}", which is not t, an input or a value'
    return "formula's brackets don't match" if depth != 0 else None
