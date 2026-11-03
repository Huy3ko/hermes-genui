"""layers: a stack of slabs in light 3D, bottom first; Hermes Desktop pulls one out at a time with Back and Next (or a
tap on a slab), and the stack turns a little when dragged. Off Desktop it reads as a numbered list."""

from .common import SLUG_RULE, first_list, has_text, is_slug, safe_text, short_text

TONES = ("blue", "amber", "green", "violet", "accent", "grey")
# The longest a title, a caption, a layer's label and a layer's note may be.
TITLE, CAPTION, LABEL, NOTE = 80, 200, 24, 280
MIN_LAYERS, MAX_LAYERS = 2, 12


def check_layers(block: dict, path: str) -> list[tuple[str, str]]:
    """2-12 layers, each with its own slug id, a short label, a tone from TONES and an optional note; an optional slug
    id, title and caption.

    layers = [{"id": "a", "label": "A"}] → [("0", "layers needs 2-12 layers")]
    a layer with tone "red" → [("0.layers.1", "tone is blue, amber, green, violet, accent or grey")]
    """
    problems = []
    if block.get("id") is not None and not is_slug(block.get("id")):
        problems.append((path, f"layers id must be {SLUG_RULE}"))
    for key, most in (("title", TITLE), ("caption", CAPTION)):
        if not short_text(block.get(key), most):
            problems.append((path, f"{key} is text of at most {most} characters"))
    layers = block.get("layers")
    if not isinstance(layers, list) or not MIN_LAYERS <= len(layers) <= MAX_LAYERS:
        return [*problems, (path, f"layers needs {MIN_LAYERS}-{MAX_LAYERS} layers")]
    seen: set[str] = set()
    for i, layer in enumerate(layers):
        why = _layer_problem(layer, seen)
        if why:
            problems.append((f"{path}.layers.{i}", why))
    return problems


def _layer_problem(layer: object, seen: set[str]) -> str | None:
    """What stops one slab being drawn, or None. Adds its id to `seen`.

    {"id": "l1", "label": "Layer 1", "tone": "violet"} → None;  {"id": "c"} → "layer needs a label ..."
    """
    if not isinstance(layer, dict):
        return "layer is not an object"
    layer_id = layer.get("id")
    if not is_slug(layer_id):
        return f"layer id must be {SLUG_RULE}"
    if layer_id in seen:
        return f'layer id "{layer_id}" is used twice'
    seen.add(layer_id)
    if not has_text(layer.get("label")) or not short_text(layer["label"], LABEL):
        return f"layer needs a label of at most {LABEL} characters"
    if layer.get("tone") is not None and layer.get("tone") not in TONES:
        return f"tone is {', '.join(TONES[:-1])} or {TONES[-1]}"
    if not short_text(layer.get("note"), NOTE):
        return f"note is text of at most {NOTE} characters"
    return None


def text_layers(block: dict) -> str:
    """The title, the caption, then "1. Embedding — Turns each token into a vector." per layer, bottom first."""
    layers = [x for x in first_list(block, "layers")[:MAX_LAYERS] if isinstance(x, dict) and safe_text(x.get("label"))]
    lines = []
    for i, layer in enumerate(layers, 1):
        label, note = safe_text(layer.get("label"), LABEL), safe_text(layer.get("note"), NOTE)
        lines.append(f"{i}. {label} — {note}" if note else f"{i}. {label}")
    if not lines:
        return ""
    title, caption = safe_text(block.get("title"), TITLE), safe_text(block.get("caption"), CAPTION)
    return "\n".join(([f"**{title}**"] if title else []) + ([caption] if caption else []) + lines)
