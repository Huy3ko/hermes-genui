"""Page images: the preview picture (og:image, twitter:image) of the top pages the user's own web search finds.
Each page is read through safety._follow, so every hop is checked before it is asked. Social and login pages are
skipped, and a picture whose page title has nothing to do with the query is dropped."""

import html
import json
import re
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urljoin, urlsplit

import httpx

from ..safety import HEADERS, REDIRECTS, SOURCE_TIMEOUT, _follow
from .common import _candidate, _items, _plain, site_name

PAGES_TO_READ = 3
MAX_PAGE_BYTES = 256 * 1024  # the preview tags are in the head, near the top
END_OF_HEAD = b"</head>"
WEB_IMAGE_RIGHTS = "rights unknown (web image)"


def _read_page(client: httpx.Client, url: str) -> str:
    """A web page's HTML through _follow, read until its head ends (the preview tags are there) or for at most
    256 KB; "" when it isn't an HTML page or can't be read."""
    def ask(hop: str) -> tuple[int, str, object]:
        with client.stream("GET", hop, headers=HEADERS, follow_redirects=False, timeout=SOURCE_TIMEOUT) as r:
            location = r.headers.get("location", "")
            if r.status_code in REDIRECTS or r.status_code != 200:
                return r.status_code, location, ""
            if "html" not in r.headers.get("content-type", ""):
                return r.status_code, "", ""
            body = bytearray()
            for chunk in r.iter_bytes():
                start = max(0, len(body) - len(END_OF_HEAD))  # the tag may straddle two chunks
                body += chunk
                if len(body) >= MAX_PAGE_BYTES or END_OF_HEAD in body[start:].lower():
                    break
            return r.status_code, "", bytes(body[:MAX_PAGE_BYTES]).decode(r.encoding or "utf-8", errors="replace")

    page = _follow(url, ask)
    return page if isinstance(page, str) else ""


# Social and login sites: the preview picture of one of their pages is a profile photo, an ad or a login screen.
SOCIAL_SITES = ("facebook.com", "instagram.com", "x.com", "twitter.com", "linkedin.com")


def is_social(url: str) -> bool:
    """Whether a result page is on a social or login site: one of SOCIAL_SITES or a subdomain of one, or Pinterest
    under any country ending.

    "https://m.facebook.com/x" → True;  "https://www.pinterest.co.uk/pin/1" → True;  "https://box.com/x" → False;
    "https://pinterest.example.com/x" → False
    """
    host = (urlsplit(url).hostname or "").rstrip(".")
    if any(host == site or host.endswith("." + site) for site in SOCIAL_SITES):
        return True
    labels = host.split(".")
    ending = labels[labels.index("pinterest") + 1:] if "pinterest" in labels else []
    return 1 <= len(ending) <= 2 and all(len(label) <= 3 for label in ending)


def page_urls(result: object) -> list[str]:
    """The top 3 http(s) result URLs from whatever a web search returned, social pages skipped: Hermes's web_search
    JSON string ({"success": true, "data": {"web": [{"url": ...}]}}), the same as a dict, {"results": [...]}, or a
    plain list of URLs or {url|link} dicts. Anything else → [].

    '{"success": true, "data": {"web": [{"url": "https://a.example/1"}]}}' → ["https://a.example/1"]
    ["https://a.example/1", {"link": "https://b.example/2"}, "ftp://c/3"] → ["https://a.example/1", "https://b.example/2"]
    """
    if isinstance(result, (str, bytes)):
        try:
            result = json.loads(result)
        except ValueError:
            return []
    if isinstance(result, dict):
        result = (_items(result, "data", "web") or _items(result, "data") or _items(result, "results")
                  or _items(result, "web"))
    urls: list[str] = []
    for item in result if isinstance(result, list) else []:
        url = item if isinstance(item, str) else (item.get("url") or item.get("link")) if isinstance(item, dict) \
            else None
        if isinstance(url, str) and url.startswith(("https://", "http://")) and url not in urls \
                and not is_social(url):
            urls.append(url)
    return urls[:PAGES_TO_READ]


META = re.compile(r"<meta\b[^>]*>", re.IGNORECASE)
ATTRIBUTE = re.compile(r"""([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))""")
TITLE = re.compile(r"<title[^>]*>(.*?)</title>", re.IGNORECASE | re.DOTALL)


def _meta(page: str) -> dict[str, str]:
    """A page's <meta> tags as {property or name: content}, the first of each kept, html-unescaped.

    '<meta property="og:image" content="/a.jpg?x=1&amp;y=2">' → {"og:image": "/a.jpg?x=1&y=2"}
    """
    found: dict[str, str] = {}
    for tag in META.findall(page):
        attrs = {m[0].lower(): m[1] or m[2] or m[3] for m in ATTRIBUTE.findall(tag)}
        key = (attrs.get("property") or attrs.get("name") or "").lower()
        if key and key not in found:
            found[key] = html.unescape(attrs.get("content", "")).strip()
    return found


def page_image(page: str, page_url: str) -> str:
    """A page's preview picture: og:image, else twitter:image, made absolute. "" when it has neither.

    ('<meta property="og:image" content="/img/p.jpg">', "https://visit.example/pena") → "https://visit.example/img/p.jpg"
    ("<meta name='twitter:image' content='https://cdn.example/t.jpg'>", ...) → "https://cdn.example/t.jpg"
    """
    meta = _meta(page)
    for key in ("og:image", "og:image:secure_url", "og:image:url", "twitter:image", "twitter:image:src"):
        if meta.get(key):
            return urljoin(page_url, meta[key])
    return ""


MAX_TITLE = 300  # a title is read whole, so a site name at its end can go before the caption is cut short
SEPARATORS = (" | ", " - ", " – ")


def _squashed(text: str) -> str:
    """Letters and digits only, lowercased: "Kerala Tourism" → "keralatourism" """
    return "".join(c for c in text.casefold() if c.isalnum())


def without_site_name(title: str, page_url: str) -> str:
    """A page title without a trailing " | Site" or " - Site" that only repeats the name of the page's site.

    ("Candolim Beach Goa: Things to Do | Tripadvisor", "https://www.tripadvisor.in/x") → "Candolim Beach Goa: Things
    to Do";  ("Munnar | Kerala Tourism", "https://www.keralatourism.org/") → "Munnar";
    ("Kerala - God's Own Country", "https://www.keralatourism.org/") → unchanged (not the site's name)
    """
    site = site_name(page_url)
    names = {_squashed(site)} | {_squashed(label) for label in site.split(".")[:-1]}
    for separator in SEPARATORS:
        head, found, tail = title.rpartition(separator)
        if found and head.strip() and _squashed(tail) in names:
            return head.strip()
    return title


def page_photo(page: str, page_url: str) -> dict | None:
    """A page's preview picture as a candidate: captioned with the page's title (without a trailing site name),
    credited to its site, rights unknown. None when the page has no https preview picture."""
    meta = _meta(page)
    title = TITLE.search(page)
    caption = meta.get("og:title") or meta.get("twitter:title") or (title.group(1) if title else "")
    return _candidate(page_image(page, page_url), without_site_name(_plain(caption, MAX_TITLE), page_url),
                      site_name(page_url), WEB_IMAGE_RIGHTS)


# Words that say nothing about what a page shows, so they don't count when a title is matched to the query.
FILLER = frozenset({"the", "and", "for", "with", "from", "into", "near", "over", "about", "you", "your", "our",
                    "this", "that", "are", "was", "how", "what", "where", "when", "why", "who", "all", "its",
                    "best", "top", "things", "guide", "travel", "trip", "tour", "tours", "visit", "photo", "photos",
                    "image", "images", "picture", "pictures"})
WORD = re.compile(r"[^\W\d_]+")


def _forms(word: str) -> set[str]:
    """A word and the word without a plural ending: "beaches" → {"beaches", "beache", "beach"};
    "cities" → {"cities", "citie", "citi", "city"};  "goa" → {"goa"}"""
    forms = {word}
    for ending, instead in (("s", ""), ("es", ""), ("ies", "y")):
        if word.endswith(ending):
            forms.add(word[:-len(ending)] + instead)
    return forms


def _meaningful(text: str) -> set[str]:
    """Every form of every word that counts: 3 letters or more, not filler, lowercased.
    "Best beaches in Goa" → {"beaches", "beache", "beach", "goa"}"""
    return {form for word in WORD.findall(text.casefold()) if len(word) >= 3 and word not in FILLER
            for form in _forms(word)}


def on_topic(caption: str, query: str) -> bool:
    """Whether a page photo's caption shares a word with the query, case, filler and words under 3 letters ignored,
    a plural matching its singular. A query with no word that counts drops nothing.

    ("Candolim Beach Goa: Things to Do", "Goa beach Candolim North Goa") → True
    ("Send goods to India in Danang", "Munnar tea plantations Kerala hills") → False
    ("Best beaches near Panjim", "Goa beach") → True (beaches ~ beach)
    """
    wanted = _meaningful(query)
    return not wanted or bool(wanted & _meaningful(caption))


def ask(client: httpx.Client, query: str, web_search: Callable[[str], object]) -> list[dict]:
    """The preview pictures of the top 3 pages the user's web search finds, read side by side, in result order;
    those whose caption is off the query (on_topic) are dropped."""
    urls = page_urls(web_search(query))
    if not urls:
        return []
    with ThreadPoolExecutor(max_workers=len(urls)) as pool:
        pages = list(pool.map(lambda u: _read_page(client, u), urls))
    found = [page_photo(text, url) for text, url in zip(pages, urls, strict=True)]
    return [p for p in found if p and on_topic(p.get("caption", ""), query)]
