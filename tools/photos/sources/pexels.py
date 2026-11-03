"""Pexels: themes and moods; asked only when the profile has PEXELS_API_KEY."""

import httpx

from .common import MAX_CREDIT, _candidate, _get_json, _items, _plain

PEXELS = "https://api.pexels.com/v1/search"


def parse_pexels(data: object) -> list[dict]:
    """{"photos": [{"src": {"large": "https://images.pexels.com/1.jpeg"}, "alt": "Cafe", "photographer": "Joey"}]}
    → [{"url": "https://images.pexels.com/1.jpeg", "caption": "Cafe", "source": "Photo by Joey on Pexels",
    "licence": "Pexels License"}]"""
    found = []
    for r in _items(data, "photos"):
        if not isinstance(r, dict) or not isinstance(r.get("src"), dict):
            continue
        who = _plain(r.get("photographer"), MAX_CREDIT)
        photo = _candidate(r["src"].get("large"), r.get("alt"), f"Photo by {who} on Pexels" if who else "Pexels",
                           "Pexels License")
        if photo:
            found.append(photo)
    return found


def ask(client: httpx.Client, query: str, key: str) -> list[dict]:
    return parse_pexels(_get_json(client, PEXELS, {"query": query, "per_page": "10"}, {"Authorization": key}))
