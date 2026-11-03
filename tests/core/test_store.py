import importlib
import re

import pytest

from conftest import load_plugin_package

load_plugin_package()
store = importlib.import_module("hermes_genui.core.store")


def test_save_then_load_round_trips(tmp_path):
    blocks = [{"type": "text", "text": "hi"}]
    block_id = store.save(blocks, root=tmp_path)
    assert re.fullmatch(store.ID_PATTERN, block_id)
    assert store.load(block_id, root=tmp_path) == blocks


def test_save_keeps_unicode_readable(tmp_path):
    block_id = store.save([{"type": "text", "text": "₹72,275 Cr"}], root=tmp_path)
    assert "₹72,275 Cr" in (tmp_path / f"{block_id}.json").read_text(encoding="utf-8")


def test_load_rejects_bad_ids(tmp_path):
    assert store.load("../etc/passwd", root=tmp_path) is None
    assert store.load("ABCDEF12", root=tmp_path) is None
    assert store.load("", root=tmp_path) is None


def test_load_missing_returns_none(tmp_path):
    assert store.load("0badc0de", root=tmp_path) is None


def test_state_round_trips_next_to_its_block(tmp_path):
    block_id = store.save([{"type": "checklist", "items": ["Passport"]}], root=tmp_path)
    assert store.load_state(block_id, root=tmp_path) == {}
    store.save_state(block_id, {"0": [0, 2]}, root=tmp_path)
    assert store.load_state(block_id, root=tmp_path) == {"0": [0, 2]}
    assert (tmp_path / f"{block_id}.state.json").is_file()


def test_state_for_a_bad_id_is_empty_and_never_touches_the_disk(tmp_path):
    assert store.load_state("../etc/passwd", root=tmp_path) == {}
    with pytest.raises(store.NoSuchBlock):
        store.save_state("../etc/passwd", {"0": [1]}, root=tmp_path)
    assert list(tmp_path.iterdir()) == []


def test_state_for_an_unknown_block_is_refused(tmp_path):
    with pytest.raises(store.NoSuchBlock):
        store.save_state("0badc0de", {"0": [1]}, root=tmp_path)
    assert not (tmp_path / "0badc0de.state.json").exists()


def test_state_over_20kb_is_refused(tmp_path):
    block_id = store.save([{"type": "text", "text": "hi"}], root=tmp_path)
    with pytest.raises(store.StateTooBig):
        store.save_state(block_id, {"0": "x" * 21_000}, root=tmp_path)
    assert store.load_state(block_id, root=tmp_path) == {}
    store.save_state(block_id, {"0": "x" * 19_000}, root=tmp_path)


def test_a_board_over_256kb_is_refused(tmp_path):
    with pytest.raises(store.BoardTooBig):
        store.save([{"type": "text", "text": "x" * (260 * 1024)}], root=tmp_path)
    assert list(tmp_path.iterdir()) == []


# --- hygiene: whole files only, unreadable files are absent, the photo list stays short ------------------------------

import os  # noqa: E402
from pathlib import Path  # noqa: E402


def test_boards_and_state_are_written_whole_then_moved_into_place(tmp_path, monkeypatch):
    moves = []
    real_replace = os.replace

    def spy(src, dst):
        src, dst = Path(src), Path(dst)
        moves.append((src.name, dst.name, src.parent == dst.parent))
        real_replace(src, dst)

    monkeypatch.setattr(os, "replace", spy)
    block_id = store.save([{"type": "text", "text": "hi"}], root=tmp_path)
    store.save_state(block_id, {"0": [1]}, root=tmp_path)
    assert moves == [(f"{block_id}.json.tmp", f"{block_id}.json", True),
                     (f"{block_id}.state.json.tmp", f"{block_id}.state.json", True)]
    assert sorted(p.name for p in tmp_path.iterdir()) == [f"{block_id}.json", f"{block_id}.state.json"]


def test_an_unreadable_board_or_state_is_treated_as_missing(tmp_path):
    (tmp_path / "0badc0de.json").write_text("[{not json", encoding="utf-8")
    (tmp_path / "0badc0de.state.json").write_text("{half", encoding="utf-8")
    assert store.load("0badc0de", root=tmp_path) is None
    assert store.load_state("0badc0de", root=tmp_path) == {}


def test_the_photo_list_keeps_only_the_last_500(tmp_path):
    store.remember_photo_urls([f"https://a.example/{i}.jpg" for i in range(450)], root=tmp_path)
    store.remember_photo_urls([f"https://b.example/{i}.jpg" for i in range(100)], root=tmp_path)
    known = store.known_photo_urls(root=tmp_path)
    assert len(known) == 500
    assert "https://a.example/49.jpg" not in known and "https://a.example/50.jpg" in known
    assert "https://b.example/99.jpg" in known
