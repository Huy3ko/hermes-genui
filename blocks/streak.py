"""streak: a count of days in a row, with the week drawn under it."""

from .common import fmt_num, is_number, safe_text


def check_streak(block: dict, path: str) -> list[tuple[str, str]]:
    if is_number(block.get("count")):
        return []
    return [(path, "streak needs a numeric count")]


def text_streak(block: dict) -> str:
    count = block.get("count")
    if not is_number(count):
        return ""
    label = safe_text(block.get("label")) or "Current streak"
    return f"{label}: {fmt_num(count)} {safe_text(block.get('unit'), 20) or 'days'}"
