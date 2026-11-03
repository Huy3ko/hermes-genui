"""timeline: a plan, day by day: groups of stops, each with a time and a title."""

from .common import has_text, safe_text


def check_timeline(block: dict, path: str) -> list[tuple[str, str]]:
    """At least one stop with a title, in day groups or one flat list.

    groups = [{"label": "Day 1", "items": [{"time": "09:00"}]}]
    → [("0", "timeline needs at least one stop with a title")]
    """
    groups = block.get("groups")
    if not isinstance(groups, list):
        flat = next((block[k] for k in ("items", "events", "stops", "steps") if isinstance(block.get(k), list)), [])
        groups = [{"items": flat}]
    for group in groups:
        items = group.get("items") if isinstance(group, dict) else None
        if isinstance(items, list) and any(isinstance(it, dict) and has_text(it.get("title")) for it in items):
            return []
    return [(path, "timeline needs at least one stop with a title")]


def _stops(block: dict) -> list:
    """A timeline's groups; a flat list of stops (items, events, stops or steps) is one group without a label."""
    if isinstance(block.get("groups"), list):
        return block["groups"]
    flat = next((block[k] for k in ("items", "events", "stops", "steps") if isinstance(block.get(k), list)), [])
    return [{"items": flat}]


def text_timeline(block: dict) -> str:
    """The title, then each day's label in bold and its stops: "- 07:00 · Fushimi Inari (Inari)"."""
    title = safe_text(block.get("title"))
    lines = [f"**{title}**"] if title else []
    for group in _stops(block)[:14]:
        if not isinstance(group, dict) or not isinstance(group.get("items"), list):
            continue
        label = safe_text(group.get("label"))
        stops = []
        for item in group["items"][:12]:
            name = safe_text(item.get("title")) if isinstance(item, dict) else ""
            if not name:
                continue
            time, place = safe_text(item.get("time"), 40), safe_text(item.get("place"))
            stops.append("- " + (f"{time} · " if time else "") + name + (f" ({place})" if place else ""))
        if stops:
            lines += ([f"**{label}**"] if label else []) + stops
    return "\n".join(lines) if len(lines) > bool(title) else ""
