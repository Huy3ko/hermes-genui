"""progress: a track toward a goal, with optional checkpoints."""

from .common import first_of, has_text, is_number, out_of


def check_progress(block: dict, path: str) -> list[tuple[str, str]]:
    """A title, a numeric value and a goal above 0 (the track is value / goal).

    {"title": "x", "value": 5, "goal": 0} → [("0", "progress needs a goal above 0")]
    """
    if not has_text(block.get("title")):
        return [(path, "progress needs a title")]
    if not is_number(block.get("value")):
        return [(path, "progress needs a numeric value")]
    goal = block.get("goal")
    if not is_number(goal) or goal <= 0:
        return [(path, "progress needs a goal above 0")]
    return []


def text_progress(block: dict) -> str:
    return out_of(first_of(block, "title", "label"), block.get("value"), block.get("goal"), block.get("unit"))
