"""Unsplash: themes and moods; asked only when the profile has UNSPLASH_ACCESS_KEY."""

import httpx

from .common import MAX_CREDIT, _candidate, _get_json, _items, _plain

UNSPLASH = "https://api.unsplash.com/search/photos"


def parse_unsplash(data: object) -> list[dict]:
    """{"results": [{"urls": {"regular": "https://images.unsplash.com/p?w=1080"}, "alt_description": "a cup",
    "user": {"name": "Sam"}}]} → [{"url": "https://images.unsplash.com/p?w=1080", "caption": "a cup", "source":
    "Photo by Sam on Unsplash", "licence": "Unsplash License"}]"""
    found = []
    for r in _items(data, "results"):
        if not isinstance(r, dict) or not isinstance(r.get("urls"), dict):
            continue
        user = r.get("user") if isinstance(r.get("user"), dict) else {}
        who = _plain(user.get("name"), MAX_CREDIT)
        photo = _candidate(r["urls"].get("regular"), r.get("alt_description") or r.get("description"),
                           f"Photo by {who} on Unsplash" if who else "Unsplash", "Unsplash License")
        if photo:
            found.append(photo)
    return found


def ask(client: httpx.Client, query: str, key: str) -> list[dict]:
    return parse_unsplash(_get_json(client, UNSPLASH, {"query": query, "per_page": "10"},
                                    {"Authorization": f"Client-ID {key}", "Accept-Version": "v1"}))
