"""form: a small form the user fills in and sends; the answers go back as one message."""

import re

from .common import first_of, has_text, is_number, safe_text, with_unit

FIELD_KINDS = ("select", "radio", "checkbox", "slider", "text")
# A field's id is a key in the answers the web side keeps (a plain object), so it is a short plain word, and never one
# of the names every JavaScript object already has.
FIELD_ID = r"^[A-Za-z_][\w-]{0,39}$"
RESERVED_IDS = ("__proto__", "constructor", "prototype")
# The longest an option's note, a group heading, a slider's end word and a text field's placeholder may be.
NOTE, GROUP, END, PLACEHOLDER = 80, 40, 20, 60


def check_form(block: dict, path: str) -> list[tuple[str, str]]:
    """1-12 fields, each with its own id and a kind from FIELD_KINDS; select, radio and checkbox need options; a
    slider's max must be above its min (defaults 0 and 100).

    fields = [{"id": "a", "kind": "date"}] → [("0.fields.0", 'field kind "date" isn't one of ...')]
    """
    fields = block.get("fields")
    if not isinstance(fields, list) or not 1 <= len(fields) <= 12:
        return [(path, "form needs 1-12 fields")]
    problems, seen = [], set()
    for i, field in enumerate(fields):
        why = _field_problem(field, seen)
        if why:
            problems.append((f"{path}.fields.{i}", why))
    return problems


def _field_problem(field: object, seen: set[str]) -> str | None:
    """What stops one form field being drawn, or None. Adds its id to `seen`.

    {"id": "r", "kind": "radio", "options": []} → "radio needs options";  a second field with id "t" → 'field id ...'
    {"id": "two words", "kind": "text"} → 'field id must be a word like "where" ...'
    {"id": "__proto__", "kind": "text"} → 'field id "__proto__" is reserved'
    """
    if not isinstance(field, dict):
        return "field is not an object"
    kind = field.get("kind")
    if kind not in FIELD_KINDS:
        return f"field kind \"{kind}\" isn't one of {', '.join(FIELD_KINDS)}"
    field_id = field.get("id")
    if not has_text(field_id):
        return "field needs an id"
    if not re.fullmatch(FIELD_ID, field_id, flags=re.ASCII):
        return 'field id must be a word like "where" (letters, digits, _ or -)'
    if field_id in RESERVED_IDS:
        return f'field id "{field_id}" is reserved'
    if field_id in seen:
        return f'field id "{field_id}" is used twice'
    seen.add(field_id)
    if kind in ("select", "radio", "checkbox") and not (isinstance(field.get("options"), list) and field["options"]):
        return f"{kind} needs options"
    if kind == "slider":
        low = field.get("min") if is_number(field.get("min")) else 0
        high = field.get("max") if is_number(field.get("max")) else 100
        if high <= low:
            return "slider needs min below max"
    return _extras_problem(field, kind)


def _short_text(value: object, limit: int) -> bool:
    """Whether an optional extra is absent or text of at most `limit` characters: None → yes;  "Beach" → yes;  5 → no"""
    return value is None or (isinstance(value, str) and len(value) <= limit)


def _extras_problem(field: dict, kind: str) -> str | None:
    """What is wrong with a field's optional extras, or None: a group heading, an option's note, a slider's two end
    words and a text field's placeholder are short texts, and multiline is true or false.

    {"group": "The basics"} → None;  {"options": [{"value": "x", "note": 5}]} → "option note is text of ..."
    {"kind": "slider", "ends": ["slow"]} → "slider ends are two texts ...";  {"multiline": "yes"} → "multiline is ..."
    """
    if not _short_text(field.get("group"), GROUP):
        return f"group is text of at most {GROUP} characters"
    options = field.get("options") if isinstance(field.get("options"), list) else []
    notes = [o.get("note") for o in options if isinstance(o, dict)]
    if not all(_short_text(note, NOTE) for note in notes):
        return f"option note is text of at most {NOTE} characters"
    ends = field.get("ends")
    if kind == "slider" and ends is not None and not (
        isinstance(ends, list) and len(ends) == 2 and all(has_text(e) and _short_text(e, END) for e in ends)
    ):
        return f"slider ends are two texts of at most {END} characters, [left, right]"
    if not _short_text(field.get("placeholder"), PLACEHOLDER):
        return f"placeholder is text of at most {PLACEHOLDER} characters"
    if field.get("multiline") not in (None, True, False):
        return "multiline is true or false"
    return None


def _choice(value: object) -> str:
    """A form value or option as text: "Hills" → "Hills";  ["a", "b"] → "a, b";  {"label": "Beach"} → "Beach"."""
    if isinstance(value, list):
        return ", ".join(t for t in (_choice(v) for v in value[:12]) if t)
    if isinstance(value, dict):
        return first_of(value, "label", "value")
    return safe_text(value, 60)


def _option_text(option: object) -> str:
    """An option as listed in text, with its note when it has one.
    "Full" → "Full";  {"value": "easy", "label": "Easy", "note": "Beach, long lunches"} → "Easy — Beach, long lunches"
    """
    name = _choice(option)
    note = safe_text(option.get("note"), NOTE) if isinstance(option, dict) and name else ""
    return f"{name} — {note}" if note else name


def _chosen(field: dict, options: list) -> str:
    """A field's prefilled value as words: the label of the option it names, else the value itself.
    value "easy" with option {"value": "easy", "label": "Easy"} → "Easy";  value "Hills" → "Hills";  ["a", "b"] → "a, b"
    """
    value = field.get("value")
    for option in options:
        if isinstance(option, dict) and not isinstance(value, list) and option.get("value") == value:
            return _choice(option)
    return _choice(value)


def text_form(block: dict) -> str:
    """The title, then "- Where: Hills (Hills / Beach)" per field, a "The basics:" line where a group starts, and
    "(answer in a message)". An option's note follows its name: "(Easy — Beach, long lunches / Full)"."""
    fields = block.get("fields") if isinstance(block.get("fields"), list) else []
    lines, group = [], ""
    for field in fields[:12]:
        label = first_of(field, "label", "id") if isinstance(field, dict) else ""
        if not label:
            continue
        heading = safe_text(field.get("group"), GROUP)
        if heading and heading != group:
            lines.append(f"{heading}:")
        group = heading
        options = field.get("options") if isinstance(field.get("options"), list) else []
        chosen = _chosen(field, options)
        value = with_unit(chosen, safe_text(field.get("unit"), 20)) if chosen else ""
        listed = " / ".join(t for t in (_option_text(o) for o in options[:12]) if t)
        lines.append(f"- {label}" + (f": {value}" if value else "") + (f" ({listed})" if listed else ""))
    if not lines:
        return ""
    title = safe_text(block.get("title"))
    return "\n".join(([f"**{title}**"] if title else []) + lines + ["(answer in a message)"])
