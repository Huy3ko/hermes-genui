"""Tavily: image results from a web search API; asked only when the profile has TAVILY_API_KEY."""

import httpx

from ..safety import SOURCE_TIMEOUT
from .common import _candidate, _items, site_name

TAVILY = "https://api.tavily.com/search"


def parse_tavily(data: object) -> list[dict]:
    """Tavily's image results, credited to the site that holds them; their rights aren't given.

    {"images": [{"url": "https://img.x.com/a.jpg", "description": "Pena"}, "https://img.x.com/b.jpg"]}
    → [{"url": "https://img.x.com/a.jpg", "caption": "Pena", "source": "img.x.com"},
       {"url": "https://img.x.com/b.jpg", "source": "img.x.com"}]
    """
    found = []
    for item in _items(data, "images"):
        url = item.get("url") if isinstance(item, dict) else item
        caption = item.get("description") if isinstance(item, dict) else None
        photo = _candidate(url, caption, site_name(url) if isinstance(url, str) else "")
        if photo:
            found.append(photo)
    return found


def ask(client: httpx.Client, query: str, key: str) -> list[dict]:
    r = client.post(TAVILY, json={"api_key": key, "query": query, "include_images": True,
                                  "include_image_descriptions": True, "max_results": 3}, timeout=SOURCE_TIMEOUT)
    r.raise_for_status()
    return parse_tavily(r.json())
