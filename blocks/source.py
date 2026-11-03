"""source: one small line saying where the data came from."""

from .common import md_link, needs_text, safe_text, safe_url

check_source = needs_text


def text_source(block: dict) -> str:
    text = safe_text(block.get("text"))
    return f"_Source: {md_link(text, safe_url(block.get('url')))}_" if text else ""
