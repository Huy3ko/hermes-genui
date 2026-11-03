"""Serves stored blocks to the Desktop half: GET /api/plugins/hermes-genui/blocks/<id>, plus what the user did to
them (a checklist's ticks): GET and PUT /blocks/<id>/state.

Hermes imports this file on its own (not as part of the plugin package), so core/store.py is loaded by path
(it imports nothing from the package).
"""

import importlib.util
import json
from pathlib import Path

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse


def _load_store():
    path = Path(__file__).resolve().parent.parent / "core" / "store.py"
    spec = importlib.util.spec_from_file_location("hermes_genui_store", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


store = _load_store()
router = APIRouter()


@router.get("/blocks/{block_id}")
async def get_block(block_id: str):
    blocks = store.load(block_id)
    if blocks is None:
        return JSONResponse({"error": "not found"}, status_code=404)
    return {"blocks": blocks}


NOT_FOUND = {"error": "not found"}


@router.get("/blocks/{block_id}/state")
async def get_state(block_id: str):
    """{"state": {...}} once something is saved, {} before; 404 when no board has this id."""
    if store.load(block_id) is None:
        return JSONResponse(NOT_FOUND, status_code=404)
    state = store.load_state(block_id)
    return {"state": state} if state else {}


# The most a PUT body may be. The state itself is capped at store.STATE_LIMIT (20 KB); this is the request around it.
BODY_LIMIT = 32 * 1024
TOO_BIG = {"error": "state too big"}


async def _body(request: Request) -> bytes | None:
    """The request body, or None when it is (or says it is) over BODY_LIMIT. A stated Content-Length is checked
    before anything is read; without one, reading stops as soon as the limit is passed.

    Content-Length 40000 → None (nothing read);  no Content-Length, 40 KB streamed → None after 32 KB;  b'{}' → b'{}'
    """
    stated = request.headers.get("content-length")
    if stated is not None and (not stated.isdigit() or int(stated) > BODY_LIMIT):
        return None
    body = b""
    async for chunk in request.stream():
        body += chunk
        if len(body) > BODY_LIMIT:
            return None
    return body


@router.put("/blocks/{block_id}/state")
async def put_state(block_id: str, request: Request):
    """Body {"state": {...}} replaces the saved state. The id is checked before the body is read, and a body over
    32 KB is refused unread.

    {"state": {"0": [1]}} → 200;  unknown id → 404;  state over 20 KB or body over 32 KB → 413;
    {"state": [1]} or not JSON → 400
    """
    if store.load(block_id) is None:
        return JSONResponse(NOT_FOUND, status_code=404)
    raw = await _body(request)
    if raw is None:
        return JSONResponse(TOO_BIG, status_code=413)
    try:
        body = json.loads(raw)
    except (ValueError, UnicodeDecodeError):
        body = None
    state = body.get("state") if isinstance(body, dict) else None
    if not isinstance(state, dict):
        return JSONResponse({"error": "body must be {\"state\": {...}}"}, status_code=400)
    try:
        store.save_state(block_id, state)
    except store.NoSuchBlock:
        return JSONResponse(NOT_FOUND, status_code=404)
    except store.StateTooBig:
        return JSONResponse(TOO_BIG, status_code=413)
    return {"ok": True}
