"""flip: flash cards that turn over on a tap."""

from .common import first_list, first_of, has_any_text, has_text, safe_text

# The longest a card's sides may be: a short question on the front, a short answer on the back. The web side draws a
# little more (140 and 260) and cuts anything longer between words, so a card is never cut mid-word.
FRONT_MAX, BACK_MAX = 120, 240


def check_flip(block: dict, path: str) -> list[tuple[str, str]]:
    """At least one card with a front (also `question`) and a back (also `answer`), and no side longer than a card
    shows whole: a front of at most 120 characters, a back of at most 240. A card missing a side is left out quietly.

    cards = [{"front": "only"}] → [("0", "flip needs at least one card with a front and a back")]
    cards = [{"front": "Most golds?", "back": <300 characters>}] → [("0.cards.0", "back is at most 240 ...")]
    """
    cards = first_list(block, "cards")
    if not any(isinstance(c, dict) and has_any_text(c, "front", "question") and has_any_text(c, "back", "answer")
               for c in cards):
        return [(path, "flip needs at least one card with a front and a back")]
    return [(f"{path}.cards.{i}", why) for i, card in enumerate(cards) if (why := _too_long(card))]


def _too_long(card: object) -> str | None:
    """Which side of a card is too long to show whole, or None. The side is the field the web side reads (front, else
    question; back, else answer), trimmed.

    {"front": "Host?", "back": "Nagoya"} → None;  {"question": <121 characters>} → "front is at most 120 ..."
    """
    if not isinstance(card, dict):
        return None
    if len(_side(card, "front", "question")) > FRONT_MAX:
        return f"front is at most {FRONT_MAX} characters: a short question"
    if len(_side(card, "back", "answer")) > BACK_MAX:
        return f"back is at most {BACK_MAX} characters: a short answer"
    return None


def _side(card: dict, *keys: str) -> str:
    """The first of a side's fields that holds text, trimmed: _side({"question": " Host? "}, "front", "question") →
    "Host?"."""
    return next((card[k].strip() for k in keys if has_text(card.get(k))), "")


def text_flip(block: dict) -> str:
    """The title, then "- Q: Most golds? — A: China · 201" per card with both sides."""
    cards = block.get("cards") if isinstance(block.get("cards"), list) else []
    lines = []
    for card in cards[:12]:
        if not isinstance(card, dict):
            continue
        front, back = first_of(card, "front", "question"), first_of(card, "back", "answer")
        if front and back:
            lines.append(f"- Q: {front} — A: {back}")
    title = safe_text(block.get("title"))
    return "\n".join(([f"**{title}**"] if title and lines else []) + lines)
