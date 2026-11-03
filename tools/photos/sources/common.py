"""Helpers every photo source shares: plain one-line text from HTML-ish metadata, a candidate dict, safe nested
lookups, credit lines and one JSON GET."""

import html
import re
from urllib.parse import urlsplit

import httpx

from ....blocks.common import one_line
from ..safety import HEADERS, SOURCE_TIMEOUT

# A caption comes from a web page and goes back to the model: one short line of plain text.
MAX_CAPTION = 80
MAX_CREDIT = 40
TAG = re.compile(r"<[^>]*>")
BREAK = re.compile(r"<br\s*/?>|</p>|</div>|</li>", re.IGNORECASE)


def site_name(url: str) -> str:
    """The credit line for a photo: its host without www. "https://www.cntraveller.com/x.jpg" → "cntraveller.com" """
    host = (urlsplit(url or "").hostname or "").lower()
    return host[4:] if host.startswith("www.") else host


def _plain(value: object, limit: int) -> str:
    """Text that may hold HTML (Wikimedia's metadata, a page title) as one plain line.

    ('<a href="/u/J">Jane&nbsp;Doe</a>', 40) → "Jane Doe";  ("A<br>B &amp; C", 80) → "A B & C";  (None, 80) → ""
    """
    if not isinstance(value, str):
        return ""
    return one_line(html.unescape(TAG.sub("", BREAK.sub(" ", value))), limit)


def _candidate(url: object, caption: object, source: str, licence: str = "") -> dict | None:
    """One photo as found, or None without an https URL. Empty caption and licence are left out."""
    if not isinstance(url, str) or not url.startswith("https://"):
        return None
    photo = {"url": url, "caption": _plain(caption, MAX_CAPTION), "source": source, "licence": licence}
    return {k: v for k, v in photo.items() if v}


def _items(data: object, *path: str) -> list:
    """The list at a path of keys, or [] when anything on the way isn't there. ({"a": {"b": [1]}}, "a", "b") → [1]"""
    for key in path:
        data = data.get(key) if isinstance(data, dict) else None
    return data if isinstance(data, list) else []


def _credit(creator: object, where: str) -> str:
    """("Jane Doe", "Wikimedia Commons") → "Jane Doe, Wikimedia Commons";  (None, "Wikimedia Commons") → "Wikimedia
    Commons" """
    who = _plain(creator, MAX_CREDIT)
    return f"{who}, {where}" if who else where


def _get_json(client: httpx.Client, url: str, params: dict, headers: dict | None = None) -> object:
    r = client.get(url, params=params, headers={**HEADERS, **(headers or {})}, timeout=SOURCE_TIMEOUT)
    r.raise_for_status()
    return r.json()
