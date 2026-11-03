"""callout: a tinted box with an icon, for a warning, a tip or the one-line takeaway."""

from .common import needs_text, safe_text

check_callout = needs_text


def text_callout(block: dict) -> str:
    """{"title": "Note", "text": "one\\ntwo"} → "> **Note**\\n> one\\n> two"."""
    title, text = safe_text(block.get("title")), safe_text(block.get("text"), inline=False)
    lines = ([f"**{title}**"] if title else []) + [line for line in text.split("\n") if line.strip()]
    return "\n".join(f"> {line}" for line in lines)
