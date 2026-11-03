"""A short reminder added next to the user's message when it asks for something visual, in the Desktop app only.

Hermes's own Desktop guidance suggests HTML widgets (::preview) for anything rich or interactive. Right next to the
request, this reminder outweighs that general advice and keeps the answer in blocks.
"""

import re

from ..core import surface

# Surfaces that draw blocks: the Desktop app's local chat. Telegram, the CLI and the rest show tags as text.
DRAWING_PLATFORMS = frozenset({"local", "desktop"})

VISUAL = re.compile(
    r"\b(dashboard|visual\w*|chart|graph|plot|compare|comparison|vs\.?|versus|itinerary|plan|trip|timeline|"
    r"schedule|budget|breakdown|overview|report|interactive|rich|show me|photos?|pictures?|market|stocks?|"
    r"trend|progress|checklist|calculat\w*|emi|sip)\b",
    re.IGNORECASE,
)

REMINDER = (
    "[Draw this with the block tools (show_blocks, market_history, find_photos), following a recipe skill if one "
    "fits. Blocks are rich and interactive: buttons, photo tiles, checklists that save ticks, calculators with "
    "sliders, forms, sortable tables, flash cards, fold-out sections, side-by-side columns. Do not write HTML or "
    "use ::preview widgets.]"
)


def _text_of(message: object) -> str:
    """The words of a user message: a plain string, or the text parts of a multimodal one.

    [{"type": "text", "text": "a dashboard"}, {"type": "image_url", ...}] → "a dashboard"
    """
    if isinstance(message, str):
        return message
    if isinstance(message, list):
        return " ".join(p.get("text", "") for p in message if isinstance(p, dict) and p.get("type") == "text")
    return ""


def visual_nudge(user_message: object = "", platform: str = "", **kwargs) -> str | None:
    """The reminder when a Desktop message asks for something visual, else None.

    ("make me a budget dashboard", "local") → REMINDER;  ("capital of Peru?", "local") → None;
    ("make me a dashboard", "telegram") → None
    """
    surface.note_platform(str(kwargs.get("session_id") or ""), platform)  # so tools know this session's surface
    if platform not in DRAWING_PLATFORMS:
        return None
    if not VISUAL.search(_text_of(user_message)):
        return None
    return REMINDER
