"""The block store: one JSON file per drawn block, named by a short random id.

A tool saves a list of blocks and gets back an id; the reply carries only `::blocks{id="..."}`,
and the Desktop half fetches the JSON by that id. Blocks are never deleted, so old chats still draw.
"""

import json
import re
import secrets
from pathlib import Path

# 8 lowercase hex characters, e.g. "7f3a09bc". Anything else is refused before touching the disk.
ID_PATTERN = r"^[0-9a-f]{8}$"


def default_root() -> Path:
    """Where this profile keeps its blocks: <hermes home>/plugin-data/hermes-genui/blocks."""
    from hermes_constants import get_hermes_home  # only importable inside Hermes

    return get_hermes_home() / "plugin-data" / "hermes-genui" / "blocks"


# The most a stored board may take on disk. show_blocks refuses a bigger one with a note to the model first; this is
# the last guard for every other caller.
BOARD_LIMIT = 256 * 1024


class BoardTooBig(ValueError):
    """The board is over BOARD_LIMIT bytes as JSON."""


def board_size(blocks: list) -> int:
    """How many bytes a board takes stored: board_size([{"type": "divider"}]) → 20"""
    return len(json.dumps(blocks, ensure_ascii=False).encode("utf-8"))


def save(blocks: list[dict], root: Path | None = None) -> str:
    """Store a list of blocks and return its new id. Refused (BoardTooBig, nothing written) over BOARD_LIMIT."""
    text = json.dumps(blocks, ensure_ascii=False)
    if len(text.encode("utf-8")) > BOARD_LIMIT:
        raise BoardTooBig(f"{len(text.encode('utf-8'))} bytes")
    folder = root or default_root()
    folder.mkdir(parents=True, exist_ok=True)
    block_id = secrets.token_hex(4)
    _write_whole(folder / f"{block_id}.json", text)
    return block_id


def _write_whole(path: Path, text: str) -> None:
    """Write a file so a reader sees the old one or the new one, never half of it: the text goes to <name>.tmp in
    the same folder, which then replaces the file in one step.

    _write_whole(.../7f3a09bc.json, "[...]") → writes 7f3a09bc.json.tmp, then renames it to 7f3a09bc.json
    """
    tmp = path.with_name(path.name + ".tmp")
    tmp.write_text(text, encoding="utf-8")
    tmp.replace(path)  # os.replace: one step, on the same disk


def _read_json(path: Path) -> object | None:
    """A JSON file's contents, or None when it is missing or isn't readable JSON (a damaged file is treated as no
    file, so the API answers 404 rather than failing)."""
    if not path.is_file():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return None


def size(block_id: str, root: Path | None = None) -> int | None:
    """How many bytes a stored board takes, without reading it; None when the id is malformed or unknown.

    size("7f3a09bc") → 2048;  size("../etc/passwd") → None
    """
    if not re.fullmatch(ID_PATTERN, block_id or ""):
        return None
    path = (root or default_root()) / f"{block_id}.json"
    return path.stat().st_size if path.is_file() else None


def load(block_id: str, root: Path | None = None) -> list[dict] | None:
    """The stored blocks for an id, or None when the id is malformed or unknown.

    load("7f3a09bc") → [{"type": "chart", ...}]
    load("../etc/passwd") → None (never a path outside the store)
    load("0badc0de") where the file holds "[{not json" → None
    """
    if not re.fullmatch(ID_PATTERN, block_id or ""):
        return None
    return _read_json((root or default_root()) / f"{block_id}.json")


PHOTO_LIST = "photo-urls.txt"
# Only the most recent photo URLs are kept: enough for the boards of a conversation, and the file stays small.
MAX_PHOTO_URLS = 500


def remember_photo_urls(urls: list[str], root: Path | None = None) -> None:
    """Note photo URLs a tool returned, so show_blocks can refuse any the model made up. Only the last 500 are kept.

    450 noted, then 100 more → the file holds the last 350 of the first lot and all 100 new ones
    """
    folder = root or default_root()
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / PHOTO_LIST
    old = path.read_text(encoding="utf-8").splitlines() if path.is_file() else []
    kept = [line for line in old if line.strip()] + [url for url in urls if url]
    _write_whole(path, "".join(f"{url}\n" for url in kept[-MAX_PHOTO_URLS:]))


def known_photo_urls(root: Path | None = None) -> set[str]:
    path = (root or default_root()) / PHOTO_LIST
    if not path.is_file():
        return set()
    return {line.strip() for line in path.read_text(encoding="utf-8").splitlines() if line.strip()}


# What the user did to a stored board (a checklist's ticks), kept beside it as <id>.state.json so it follows them to
# every device. Small by design: a list of ticks per checklist, nothing like a document.
STATE_LIMIT = 20 * 1024


class NoSuchBlock(LookupError):
    """The id is malformed, or no board is stored under it."""


class StateTooBig(ValueError):
    """The state is over STATE_LIMIT bytes as JSON."""


def load_state(block_id: str, root: Path | None = None) -> dict:
    """The saved state for a board, or {} when there is none (or the id is malformed).

    load_state("7f3a09bc") → {"0": [0, 2]}   (the first block, a checklist, has items 0 and 2 ticked)
    load_state("../etc/passwd") → {}
    load_state("7f3a09bc") where the file holds "{half" → {}
    """
    if not re.fullmatch(ID_PATTERN, block_id or ""):
        return {}
    state = _read_json((root or default_root()) / f"{block_id}.state.json")
    return state if isinstance(state, dict) else {}


def save_state(block_id: str, state: dict, root: Path | None = None) -> None:
    """Replace a board's saved state. Refused for an id with no stored board, and for a state over 20 KB.

    save_state("7f3a09bc", {"0": [0, 2]}) → written to 7f3a09bc.state.json
    save_state("0badc0de", {...}) where no such board → NoSuchBlock;  {"0": "x" * 30000} → StateTooBig
    """
    if load(block_id, root) is None:
        raise NoSuchBlock(block_id)
    text = json.dumps(state, ensure_ascii=False)
    if len(text.encode("utf-8")) > STATE_LIMIT:
        raise StateTooBig(block_id)
    _write_whole((root or default_root()) / f"{block_id}.state.json", text)
