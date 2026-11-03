"""The block registry (blocks.TYPES) and the catalog must name the same types, and the text the model reads must not
change by accident."""

import importlib
import json

from conftest import ROOT, load_plugin_package

load_plugin_package()
blocks = importlib.import_module("hermes_genui.blocks")
catalog_text = importlib.import_module("hermes_genui.core.catalog_text")

CATALOG = json.loads((ROOT / "core" / "catalog.json").read_text(encoding="utf-8"))
KINDS = [entry["kind"] for entry in CATALOG["blocks"]]


def test_every_catalog_type_has_exactly_one_registry_entry():
    assert len(KINDS) == len(set(KINDS))
    assert sorted(blocks.TYPES) == sorted(KINDS)


def test_every_entry_is_a_checker_and_a_text_renderer():
    for kind, entry in blocks.TYPES.items():
        check, text = entry
        assert callable(check) and callable(text), kind


def test_describe_is_pinned():
    # The tool description the model reads. A catalog edit changes it on purpose: then update the fixture (from the
    # plugin folder) with
    #   (cd core && python3 -c "import catalog_text; print(catalog_text.describe(), end='')") \
    #     > tests/fixtures/describe.txt
    pinned = (ROOT / "tests" / "fixtures" / "describe.txt").read_text(encoding="utf-8")
    assert catalog_text.describe() == pinned
