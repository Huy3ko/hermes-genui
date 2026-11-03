"""include: names a stored board by id; show_blocks swaps it for that board before storing."""

import re

ID_PATTERN = r"^[0-9a-f]{8}$"


def check_include(block: dict, path: str) -> list[tuple[str, str]]:
    """An include names a stored board by id; show_blocks swaps it for that board.

    {"type": "include", "id": "7f3a09bc"} → [];  {"type": "include", "id": "nope"} → one problem
    """
    if isinstance(block.get("id"), str) and re.fullmatch(ID_PATTERN, block["id"]):
        return []
    return [(path, 'include needs the id of a stored board, like "7f3a09bc"')]


def text_include(block: dict) -> str:
    """Nothing: show_blocks swaps an include for its board before storing, so a stored one has no text."""
    return ""
