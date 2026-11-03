"""Which chat surface a tool is running for, so tools only build boards where they can be drawn.

Hermes tells a tool only its session id. The plugin's pre_llm_call hook (hooks/visual_nudge.py) is told the session's
platform each turn and notes it here, so tools can look it up. Without a note, Hermes's session variables are consulted.
"""

import os
from collections.abc import Callable

# Surfaces that draw blocks: the Desktop app's local chat.
DRAWING = frozenset({"local", "desktop"})
MAX_SESSIONS = 500

_seen: dict[str, str] = {}

CANT_DRAW = ("This chat surface can't draw blocks, so nothing was drawn. Write the answer as plain text and Markdown "
             "instead (a Markdown table works well for comparisons).")


def note_platform(session_id: str, platform: str) -> None:
    """Remember a session's platform (newest kept; the oldest dropped past MAX_SESSIONS)."""
    if not session_id or not platform:
        return
    _seen.pop(session_id, None)
    _seen[session_id] = platform.strip().lower()
    while len(_seen) > MAX_SESSIONS:
        _seen.pop(next(iter(_seen)))


def _session_env(name: str) -> str:
    """A Hermes session variable (set per turn by the gateway, CLI and Desktop), or the process environment."""
    try:
        from gateway.session_context import get_session_env  # only importable inside Hermes

        return get_session_env(name, "")
    except Exception:
        return os.environ.get(name, "")


def can_draw(getenv: Callable[[str], str] | None = None, session_id: str = "") -> bool:
    """Whether this turn's surface draws blocks. An unknown surface keeps drawing (the behaviour before this check).

    noted "cli" → False;  noted "local" → True;  else platform "telegram" → False;  source "desktop" → True;
    nothing known → True
    """
    if session_id in _seen:
        return _seen[session_id] in DRAWING
    get = getenv or _session_env
    known = [v.strip().lower() for v in (get("HERMES_PLATFORM"), get("HERMES_SESSION_PLATFORM"),
                                          get("HERMES_SESSION_SOURCE")) if v and v.strip()]
    if not known:
        return True
    return any(v in DRAWING for v in known)
