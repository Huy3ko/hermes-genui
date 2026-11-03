"""checklist: things to do or pack; the user's ticks are saved with the board."""

from .common import has_text, safe_text


def check_checklist(block: dict, path: str) -> list[tuple[str, str]]:
    """1-40 items, each text or {text, group}.

    items = ["Passport", {"group": "Clothes"}] → [("0.items.1", "item needs text")]
    """
    items = block.get("items")
    if not isinstance(items, list) or not 1 <= len(items) <= 40:
        return [(path, "checklist needs 1-40 items")]
    return [
        (f"{path}.items.{i}", "item needs text")
        for i, it in enumerate(items)
        if not (has_text(it) or (isinstance(it, dict) and has_text(it.get("text"))))
    ]


def text_checklist(block: dict) -> str:
    """The title, then "- [ ] Jacket" per item (a string, or {text, group})."""
    items = block.get("items") if isinstance(block.get("items"), list) else []
    lines = []
    for item in items[:40]:
        text = safe_text(item.get("text")) if isinstance(item, dict) else safe_text(item)
        if text:
            lines.append(f"- [ ] {text}")
    title = safe_text(block.get("title"))
    return "\n".join(([f"**{title}**"] if title and lines else []) + lines)
