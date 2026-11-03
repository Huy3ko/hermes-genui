"""steps: a walkthrough shown one step at a time with Back and Next. With `for` naming a flow on the same board, each
step's `node` lights up that box in the flow (the drawing side ignores names it can't find). A step can also change
what boxes hold from then on (`holds`), send a packet from the box lit before to its own (`send`) and run the flow's
repeated group again (`tick`)."""

from .common import (
    SLUG_RULE,
    first_list,
    has_text,
    is_https,
    is_slug,
    safe_text,
    short_text,
)
from .flow import CHIPS, MAX_NODES, chips_ok, chips_text, is_count

# The longest a title (the block's or a step's) and a step's text may be.
TITLE, TEXT = 80, 600
MIN_ITEMS, MAX_ITEMS = 2, 12
MAX_TICK = 20
HOLDS = f'holds maps node ids to chips: {{"embed": ["a vector"]}}, at most {MAX_NODES} nodes'


def check_steps(block: dict, path: str) -> list[tuple[str, str]]:
    """2-12 items, each with a short title and optional text, node (a slug) and https image; an optional title and
    `for` (a flow's id).

    items = [{"title": "Only"}] → [("0", "steps needs 2-12 items")]
    items = [..., {"title": "x", "image": "http://a/x.jpg"}] → [("0.items.1", "image must be an https photo url")]
    """
    problems = []
    if block.get("for") is not None and not is_slug(block.get("for")):
        problems.append((path, f"for must be a flow's id, {SLUG_RULE}"))
    if not short_text(block.get("title"), TITLE):
        problems.append((path, f"title is text of at most {TITLE} characters"))
    items = block.get("items")
    if not isinstance(items, list) or not MIN_ITEMS <= len(items) <= MAX_ITEMS:
        return [*problems, (path, f"steps needs {MIN_ITEMS}-{MAX_ITEMS} items")]
    for i, item in enumerate(items):
        why = _item_problem(item)
        if why:
            problems.append((f"{path}.items.{i}", why))
    return problems


def _item_problem(item: object) -> str | None:
    """What stops one step being drawn, or None.

    {"title": "Attend", "node": "attn"} → None;  {"text": "x"} → "step needs a title ..."
    {"title": "x", "node": "Two Words"} → "node must be a node id, ..."
    """
    if not isinstance(item, dict):
        return "step is not an object"
    if not has_text(item.get("title")) or not short_text(item["title"], TITLE):
        return f"step needs a title of at most {TITLE} characters"
    if not short_text(item.get("text"), TEXT):
        return f"text is text of at most {TEXT} characters"
    if item.get("node") is not None and not is_slug(item.get("node")):
        return f"node must be a node id, {SLUG_RULE}"
    if item.get("image") is not None and not is_https(item.get("image")):
        return "image must be an https photo url"
    return _change_problem(item)


def _change_problem(item: dict) -> str | None:
    """What is wrong with how a step changes its flow, or None: holds maps node ids to chips, send is true or false,
    tick (how many more times the repeated group runs) is 1-20.

    {"holds": {"embed": ["[.2 …]"]}, "send": True} → None;  {"holds": ["a"]} → HOLDS;  {"tick": 21} → "tick is ..."
    """
    holds = item.get("holds")
    if holds is not None:
        if not isinstance(holds, dict) or len(holds) > MAX_NODES or not all(is_slug(k) for k in holds):
            return HOLDS
        if not all(chips_ok(chips) for chips in holds.values()):
            return CHIPS
    if item.get("send") not in (None, True, False):
        return "send is true or false"
    if item.get("tick") is not None and not is_count(item["tick"], 1, MAX_TICK):
        return f"tick is a whole number from 1 to {MAX_TICK}"
    return None


def text_steps(block: dict, labels: dict | None = None) -> str:
    """The title, then a paragraph per titled step: "**Step 1 of 6 · Split the text**", its text below, then what it
    changes: "Embeddings now holds: [.2 …], [.8 …]" per box it fills and "The repeated part runs 5 more times." for a
    tick. `labels` (node id → label, from the flow the steps are for) names the boxes; without one a box goes by its id.
    """
    items = [it for it in first_list(block, "items")[:MAX_ITEMS] if isinstance(it, dict) and safe_text(it.get("title"))]
    parts = []
    for i, item in enumerate(items, 1):
        head = f"**Step {i} of {len(items)} · {safe_text(item.get('title'), TITLE)}**"
        lines = [head, safe_text(item.get("text"), TEXT), *_change_lines(item, labels or {})]
        parts.append("\n".join(line for line in lines if line))
    if not parts:
        return ""
    title = safe_text(block.get("title"), TITLE)
    return "\n\n".join(([f"**{title}**"] if title else []) + parts)


def _change_lines(item: dict, labels: dict) -> list[str]:
    """How one step changes its flow, as lines: {"holds": {"emb": ["v"]}, "tick": 2} with emb labelled Embeddings
    → ["Embeddings now holds: v", "The repeated part runs 2 more times."]"""
    holds = item.get("holds") if isinstance(item.get("holds"), dict) else {}
    lines = []
    for node, chips in list(holds.items())[:MAX_NODES]:
        name = safe_text(labels.get(node), TITLE) or safe_text(node, 24)
        held = chips_text(chips)
        if name and held:
            lines.append(f"{name} now holds: {held}")
    if is_count(item.get("tick"), 1, MAX_TICK):
        lines.append(f"The repeated part runs {item['tick']} more times.")
    return lines
