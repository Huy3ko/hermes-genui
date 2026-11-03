"""flow: boxes joined by arrows, the big picture of how something works; a tap on a box shows its note.

v1 is a straight chain in node order. Groups draw a labelled frame around a run of neighbouring nodes (a part that
repeats, `count` times). A node's `holds` are small chips saying what is in that box ("The", "animal", ...). A steps
block can point at a flow by its id, light up one node per step, change what boxes hold and send a packet between them.
"""

from .common import (
    SLUG_RULE,
    catalog_icons,
    first_list,
    has_text,
    is_slug,
    safe_text,
    short_text,
)

ICONS = catalog_icons()
DIRECTIONS = ("right", "down")
# The longest a title, a node's label, a node's note and a group's label may be.
TITLE, LABEL, NOTE, GROUP = 80, 40, 280, 40
MIN_NODES, MAX_NODES, MAX_GROUPS = 2, 10, 3
RUN = "group nodes must be node ids next to each other, in order"
# What a box holds: up to 10 chips, each short text or {text, tone: "accent"} to pick one out.
CHIP, MAX_CHIPS = 16, 10
CHIPS = f'holds is at most {MAX_CHIPS} chips, each text of at most {CHIP} characters or {{text, tone: "accent"}}'
MIN_COUNT, MAX_COUNT = 2, 100


def chips_ok(chips: object) -> bool:
    """Whether a box's chips can be drawn: [] → yes;  ["The", {"text": "it", "tone": "accent"}] → yes;
    ["a" * 17] → no;  [{"text": "x", "tone": "loud"}] → no;  "The" → no"""
    if not isinstance(chips, list) or len(chips) > MAX_CHIPS:
        return False
    return all(_chip_ok(c) for c in chips)


def _chip_ok(chip: object) -> bool:
    """"The" → yes;  {"text": "it", "tone": "accent"} → yes;  {"text": "it", "tone": "loud"} → no"""
    if isinstance(chip, dict):
        return _chip_ok(chip.get("text")) and chip.get("tone") in (None, "accent")
    return has_text(chip) and len(chip) <= CHIP


def chips_text(chips: object) -> str:
    """The chips as one line: ["The", {"text": "it", "tone": "accent"}] → "The, it"."""
    if not isinstance(chips, list):
        return ""
    words = (safe_text(c.get("text") if isinstance(c, dict) else c, CHIP) for c in chips[:MAX_CHIPS])
    return ", ".join(w for w in words if w)


def is_count(value: object, low: int, high: int) -> bool:
    """A whole number from low to high (not a bool): (6, 2, 100) → True;  (True, 2, 100) → False;  (2.5, ...) → False"""
    return isinstance(value, int) and not isinstance(value, bool) and low <= value <= high


def check_flow(block: dict, path: str) -> list[tuple[str, str]]:
    """2-10 nodes, each with its own slug id and a short label; an optional slug id for the flow, a short title, a
    direction (right or down) and up to 3 groups, each framing a run of neighbouring nodes no other group holds.

    nodes = [{"id": "a", "label": "A"}] → [("0", "flow needs 2-10 nodes")]
    groups = [{"label": "x", "nodes": ["a", "c"]}] → [("0.groups.0", "group nodes must be node ids next to each ...")]
    """
    problems = []
    if block.get("id") is not None and not is_slug(block.get("id")):
        problems.append((path, f"flow id must be {SLUG_RULE}"))
    if not short_text(block.get("title"), TITLE):
        problems.append((path, f"title is text of at most {TITLE} characters"))
    if block.get("direction") is not None and block.get("direction") not in DIRECTIONS:
        problems.append((path, 'direction is "right" or "down"'))
    nodes = block.get("nodes")
    if not isinstance(nodes, list) or not MIN_NODES <= len(nodes) <= MAX_NODES:
        return [*problems, (path, f"flow needs {MIN_NODES}-{MAX_NODES} nodes")]
    seen: list[str] = []
    for i, node in enumerate(nodes):
        why = _node_problem(node, seen)
        if why:
            problems.append((f"{path}.nodes.{i}", why))
    return problems + _groups_problems(block.get("groups"), seen, path)


def _node_problem(node: object, seen: list[str]) -> str | None:
    """What stops one node being drawn, or None. Adds its id to `seen` (in order, so groups can check for a run).

    {"id": "a", "label": "A", "icon": "brain"} → None;  {"id": "a"} → "node needs a label"
    {"id": "Two Words", "label": "x"} → "node id must be a short lowercase slug ..."
    """
    if not isinstance(node, dict):
        return "node is not an object"
    node_id = node.get("id")
    if not is_slug(node_id):
        return f"node id must be {SLUG_RULE}"
    if node_id in seen:
        return f'node id "{node_id}" is used twice'
    seen.append(node_id)
    if not has_text(node.get("label")):
        return "node needs a label"
    if not short_text(node["label"], LABEL):
        return f"label is text of at most {LABEL} characters"
    if not short_text(node.get("note"), NOTE):
        return f"note is text of at most {NOTE} characters"
    if node.get("icon") is not None and node.get("icon") not in ICONS:
        return f'icon "{node.get("icon")}" isn\'t one of the catalog icons'
    if node.get("holds") is not None and not chips_ok(node["holds"]):
        return CHIPS
    return None


def _groups_problems(groups: object, order: list[str], path: str) -> list[tuple[str, str]]:
    """Up to 3 groups, each a short label and a run of neighbouring node ids (in node order) that no other group holds.

    order a, b, c, d:  [{"label": "x", "nodes": ["b", "c"]}] → [];  ["c", "b"] → a problem (not in order)
    two groups both holding "c" → the second one: "groups can't share nodes"
    """
    if groups is None:
        return []
    if not isinstance(groups, list) or len(groups) > MAX_GROUPS:
        return [(path, f"flow takes at most {MAX_GROUPS} groups")]
    problems, taken = [], set()
    for j, group in enumerate(groups):
        here = f"{path}.groups.{j}"
        if not isinstance(group, dict) or not has_text(group.get("label")) or not short_text(group["label"], GROUP):
            problems.append((here, f"group needs a label of at most {GROUP} characters"))
            continue
        ids = group.get("nodes")
        if group.get("count") is not None and not is_count(group["count"], MIN_COUNT, MAX_COUNT):
            problems.append((here, f"count is a whole number from {MIN_COUNT} to {MAX_COUNT}"))
        elif not _is_run(ids, order):
            problems.append((here, RUN))
        elif taken & set(ids):
            problems.append((here, "groups can't share nodes"))
        else:
            taken |= set(ids)
    return problems


def _is_run(ids: object, order: list[str]) -> bool:
    """Whether ids is a non-empty run of neighbouring nodes, in node order: (["b", "c"], [a, b, c]) → True;
    (["a", "c"], ...) → False;  (["z"], ...) → False;  ([], ...) → False"""
    if not isinstance(ids, list) or not ids or not all(isinstance(k, str) and k in order for k in ids):
        return False
    start = order.index(ids[0])
    return order[start:start + len(ids)] == ids


def text_flow(block: dict) -> str:
    """The title, then "1. Tokens — The text split into pieces." per node with a label ("(holds: The, animal)" after
    it when it holds chips), and a line per group: "_Repeated × 6: steps 2-3_" (× its count, when it has one)."""
    nodes = [n for n in first_list(block, "nodes")[:MAX_NODES] if isinstance(n, dict) and safe_text(n.get("label"))]
    lines = []
    for i, node in enumerate(nodes, 1):
        label, note = safe_text(node.get("label"), LABEL), safe_text(node.get("note"), NOTE)
        holds = chips_text(node.get("holds"))
        line = f"{i}. {label} — {note}" if note else f"{i}. {label}"
        lines.append(f"{line} (holds: {holds})" if holds else line)
    if not lines:
        return ""
    numbers = {n.get("id"): i for i, n in enumerate(nodes, 1) if isinstance(n.get("id"), str)}
    for group in first_list(block, "groups")[:MAX_GROUPS]:
        label = safe_text(group.get("label"), GROUP) if isinstance(group, dict) else ""
        at = [numbers[k] for k in group.get("nodes") or [] if isinstance(k, str) and k in numbers] if label else []
        if at:
            span = f"step {at[0]}" if len(at) == 1 else f"steps {min(at)}-{max(at)}"
            count = group.get("count")
            times = f" × {count}" if is_count(count, MIN_COUNT, MAX_COUNT) else ""
            lines.append(f"_{label}{times}: {span}_")
    title = safe_text(block.get("title"), TITLE)
    return "\n".join(([f"**{title}**"] if title else []) + lines)
