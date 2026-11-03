"""images: a strip of photos with captions and sources."""

from .atoms import text_image
from .common import safe_text


def check_images(block: dict, path: str) -> list[tuple[str, str]]:
    images = block.get("images")
    if isinstance(images, list) and any(
        isinstance(im, dict) and str(im.get("url", "")).startswith("https://") for im in images
    ):
        return []
    return [(path, "images needs at least one https url")]


def text_images(block: dict) -> str:
    """The title, then a line per photo: "![Fushimi Inari](https://...) [Wikimedia]"; a bad URL keeps the caption."""
    photos = block.get("images") if isinstance(block.get("images"), list) else []
    lines = []
    for photo in photos[:12]:
        if not isinstance(photo, dict):
            continue
        line, source = text_image(photo), safe_text(photo.get("source"))
        if line:
            lines.append(f"{line} [{source}]" if source else line)
    title = safe_text(block.get("title"))
    return "\n".join(([f"**{title}**"] if title and lines else []) + lines)
