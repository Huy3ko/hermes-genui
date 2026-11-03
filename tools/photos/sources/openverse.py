"""Openverse: free, no key; openly licensed photos from Flickr and other providers."""

import httpx

from ....blocks.common import one_line
from .common import MAX_CREDIT, _candidate, _credit, _get_json, _items, _plain

OPENVERSE = "https://api.openverse.org/v1/images/"


def openverse_licence(code: object, version: object) -> str:
    """("by-sa", "2.0") → "CC BY-SA 2.0";  ("cc0", "1.0") → "CC0 1.0";  ("pdm", "1.0") → "Public Domain Mark 1.0";
    ("", None) → "" """
    code, version = str(code or "").strip().lower(), str(version or "").strip()
    if not code:
        return ""
    name = {"cc0": "CC0", "pdm": "Public Domain Mark"}.get(code, "CC " + code.upper())
    return one_line(f"{name} {version}", MAX_CREDIT)


def parse_openverse(data: object) -> list[dict]:
    """Photos from an Openverse search, https only, credited to the creator with the provider and licence.

    {"results": [{"url": "https://live.staticflickr.com/1.jpg", "title": "Dusk", "creator": "Ana", "license":
    "by-sa", "license_version": "2.0", "provider": "flickr"}]} → [{"url": "https://live.staticflickr.com/1.jpg",
    "caption": "Dusk", "source": "Ana, Openverse (flickr)", "licence": "CC BY-SA 2.0"}]
    """
    found = []
    for r in _items(data, "results"):
        if not isinstance(r, dict):
            continue
        provider = _plain(r.get("provider") or r.get("source"), 30)
        where = f"Openverse ({provider})" if provider else "Openverse"
        photo = _candidate(r.get("url"), r.get("title"), _credit(r.get("creator"), where),
                           openverse_licence(r.get("license"), r.get("license_version")))
        if photo:
            found.append(photo)
    return found


def ask(client: httpx.Client, query: str) -> list[dict]:
    return parse_openverse(_get_json(client, OPENVERSE, {"q": query, "page_size": "20", "mature": "false"}))
