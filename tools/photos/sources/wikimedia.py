"""Wikimedia Commons: free, no key, and best for named places."""

import httpx

from .common import MAX_CAPTION, MAX_CREDIT, _candidate, _credit, _get_json, _items, _plain

WIKIMEDIA = "https://commons.wikimedia.org/w/api.php"


def parse_wikimedia(data: object) -> list[dict]:
    """Photos from a Commons search (generator=search, prop=imageinfo), in search order: the 1280px thumb, credited
    to the artist with the licence. SVGs and anything that isn't an image (video, audio, PDF) are left out.

    {"query": {"pages": [{"index": 1, "title": "File:Pena.jpg", "imageinfo": [{"thumburl": "https://upload...",
    "mime": "image/jpeg", "extmetadata": {"Artist": {"value": "<a>Jane</a>"}, "LicenseShortName": {"value":
    "CC BY-SA 4.0"}}}]}]}} → [{"url": "https://upload...", "caption": "Pena", "source": "Jane, Wikimedia Commons",
    "licence": "CC BY-SA 4.0"}]
    """
    pages = data.get("query", {}).get("pages") if isinstance(data, dict) and isinstance(data.get("query"), dict) \
        else None
    if isinstance(pages, dict):  # the older formatversion=1 shape, keyed by page id
        pages = list(pages.values())
    pages = [p for p in pages or [] if isinstance(p, dict)]
    pages.sort(key=lambda p: p.get("index") if isinstance(p.get("index"), int) else 1 << 30)
    found = []
    for p in pages:
        info = _items(p, "imageinfo")
        info = info[0] if info and isinstance(info[0], dict) else {}
        mime = str(info.get("mime", ""))
        if not mime.startswith("image/") or "svg" in mime:
            continue
        meta = info.get("extmetadata") if isinstance(info.get("extmetadata"), dict) else {}

        def field(name: str) -> object:
            return meta.get(name, {}).get("value") if isinstance(meta.get(name), dict) else None
        title = str(p.get("title", "")).removeprefix("File:").rsplit(".", 1)[0]
        caption = _plain(field("ImageDescription"), MAX_CAPTION) or _plain(field("ObjectName"), MAX_CAPTION) or title
        photo = _candidate(info.get("thumburl"), caption, _credit(field("Artist"), "Wikimedia Commons"),
                           _plain(field("LicenseShortName"), MAX_CREDIT))
        if photo:
            found.append(photo)
    return found


def ask(client: httpx.Client, query: str) -> list[dict]:
    return parse_wikimedia(_get_json(client, WIKIMEDIA, {
        "action": "query", "format": "json", "formatversion": "2", "generator": "search", "gsrsearch": query,
        "gsrnamespace": "6", "gsrlimit": "12", "prop": "imageinfo", "iiprop": "url|extmetadata|mime",
        "iiurlwidth": "1280"}))
