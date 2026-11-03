"""layers: a stack of slabs in light 3D, one pulled out at a time. Checked strictly; a list off Desktop."""

import importlib

from conftest import load_plugin_package

load_plugin_package()
check_blocks = importlib.import_module("hermes_genui.core.check").check_blocks
tf = importlib.import_module("hermes_genui.hooks.text_fallback")

STACK = {"type": "layers", "title": "The transformer stack", "caption": "Simplified to one stack.", "layers": [
    {"id": "embed", "label": "Embedding", "tone": "blue", "note": "Turns each token into a **vector**."},
    {"id": "l1", "label": "Layer 1", "tone": "violet", "note": "Attention, then feed-forward."},
    {"id": "out", "label": "Output", "tone": "green"},
]}


def test_a_good_stack_passes():
    assert check_blocks([STACK]) == []
    assert check_blocks([{"type": "layers", "layers": [{"id": "a", "label": "A"}, {"id": "b", "label": "B"}]}]) == []


def test_the_stack_needs_2_to_12_layers():
    one = {"type": "layers", "layers": [{"id": "a", "label": "A"}]}
    many = {"type": "layers", "layers": [{"id": f"l{i}", "label": "L"} for i in range(13)]}
    assert check_blocks([one, many, {"type": "layers"}]) == [
        "0: layers needs 2-12 layers", "1: layers needs 2-12 layers", "2: layers needs 2-12 layers"]


def test_fields_are_checked_strictly():
    layers = [
        {"id": "ok", "label": "Fine", "tone": "accent", "note": "n" * 280},
        {"id": "ok", "label": "Twice"},
        {"id": "Big One", "label": "x"},
        {"id": "c"},
        {"id": "d", "label": "l" * 25},
        {"id": "e", "label": "E", "tone": "red"},
        {"id": "f", "label": "F", "note": "n" * 281},
        "g",
    ]
    block = {"type": "layers", "id": "Not A Slug", "title": "t" * 81, "caption": "c" * 201, "layers": layers}
    assert check_blocks([block]) == [
        '0: layers id must be a short lowercase slug like "tf" (a-z, 0-9, - or _; up to 24)',
        "0: title is text of at most 80 characters",
        "0: caption is text of at most 200 characters",
        '0.layers.1: layer id "ok" is used twice',
        '0.layers.2: layer id must be a short lowercase slug like "tf" (a-z, 0-9, - or _; up to 24)',
        "0.layers.3: layer needs a label of at most 24 characters",
        "0.layers.4: layer needs a label of at most 24 characters",
        "0.layers.5: tone is blue, amber, green, violet, accent or grey",
        "0.layers.6: note is text of at most 280 characters",
        "0.layers.7: layer is not an object",
    ]


def test_text_lists_the_layers_in_order_with_their_notes():
    assert tf.blocks_as_text([STACK]) == (
        "**The transformer stack**\n"
        "Simplified to one stack.\n"
        "1. Embedding — Turns each token into a **vector**.\n"
        "2. Layer 1 — Attention, then feed-forward.\n"
        "3. Output"
    )
