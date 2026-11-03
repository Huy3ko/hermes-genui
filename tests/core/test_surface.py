import importlib

import httpx
import pytest

from conftest import load_plugin_package

load_plugin_package()
surface = importlib.import_module("hermes_genui.core.surface")
tools = importlib.import_module("hermes_genui.tools.show_blocks")
markets = importlib.import_module("hermes_genui.tools.market_history")
photos = importlib.import_module("hermes_genui.tools.photos")
plugin_store = importlib.import_module("hermes_genui.core.store")


def env(**values):
    return lambda name: values.get(name, "")


@pytest.mark.parametrize(("values", "draws"), [
    ({"HERMES_SESSION_PLATFORM": "local"}, True),
    ({"HERMES_SESSION_SOURCE": "desktop"}, True),
    ({"HERMES_SESSION_PLATFORM": "telegram"}, False),
    ({"HERMES_SESSION_SOURCE": "cli"}, False),
    ({"HERMES_PLATFORM": "slack"}, False),
    ({}, True),  # unknown surface: keep drawing, as before
])
def test_can_draw(values, draws):
    assert surface.can_draw(env(**values)) is draws


@pytest.fixture
def text_surface(tmp_path, monkeypatch):
    monkeypatch.setattr(surface, "can_draw", lambda getenv=None, session_id="": False)
    monkeypatch.setattr(plugin_store, "default_root", lambda: tmp_path)
    return tmp_path


def test_show_blocks_says_it_cant_draw_here_and_stores_nothing(text_surface):
    result = tools.show_blocks({"blocks": [{"type": "text", "text": "hi"}]})
    assert "can't draw blocks" in result and "::blocks" not in result
    assert list(text_surface.glob("*.json")) == []


def test_market_history_returns_only_the_summary(text_surface):
    closes = [24000.0, 24310.5]
    meta = {"symbol": "^NSEI", "shortName": "NIFTY 50", "currency": "INR", "exchangeTimezoneName": "Asia/Kolkata"}
    result = {"meta": meta, "timestamp": [1761955200, 1762041600], "indicators": {"quote": [{"close": closes}]}}
    payload = {"chart": {"result": [result]}}
    client = httpx.Client(transport=httpx.MockTransport(lambda r: httpx.Response(200, json=payload)))
    result = markets.history("NIFTY", "1mo", client=client)
    assert "NIFTY 50" in result and "::blocks" not in result and "Put this" not in result
    assert list(text_surface.glob("*.json")) == []


def test_find_photos_lists_links_without_a_board(text_surface, monkeypatch):
    monkeypatch.setattr(photos, "find", lambda query, **kw: [{"url": "https://a.example/x.jpg", "caption": "X",
                                                              "source": "a.example"}])
    result = photos.find_photos({"query": "Lisbon"})
    assert "https://a.example/x.jpg" in result and "::blocks" not in result
    assert list(text_surface.glob("*.json")) == []


def test_a_comparison_chart_hides_its_change_chip(tmp_path, monkeypatch):
    monkeypatch.setattr(plugin_store, "default_root", lambda: tmp_path)
    board = markets._compare_board([
        {"name": "A", "sym": "A", "unit": "USD", "x": ["1", "2"], "y": [100.0, 110.0]},
        {"name": "B", "sym": "B", "unit": "USD", "x": ["1", "2"], "y": [50.0, 45.0]},
    ], "1mo")
    chart = next(b for b in board if b["type"] == "chart")
    assert chart["figure"] is False


def test_the_surface_noted_for_a_session_wins():
    surface.note_platform("s-cli", "cli")
    surface.note_platform("s-desk", "local")
    assert surface.can_draw(env(), session_id="s-cli") is False
    assert surface.can_draw(env(), session_id="s-desk") is True
    assert surface.can_draw(env(), session_id="s-unknown") is True


def test_the_nudge_hook_notes_the_surface():
    nudge = importlib.import_module("hermes_genui.hooks.visual_nudge")
    nudge.visual_nudge(user_message="hello", platform="telegram", session_id="s-tg")
    assert surface.can_draw(env(), session_id="s-tg") is False


def test_tools_use_the_session_they_run_in(tmp_path, monkeypatch):
    monkeypatch.setattr(plugin_store, "default_root", lambda: tmp_path)
    surface.note_platform("s-cli2", "cli")
    result = tools.show_blocks({"blocks": [{"type": "text", "text": "hi"}]}, session_id="s-cli2")
    assert "can't draw blocks" in result
    assert list(tmp_path.glob("*.json")) == []


def test_the_session_list_stays_small():
    for i in range(surface.MAX_SESSIONS + 50):
        surface.note_platform(f"bulk-{i}", "cli")
    assert len(surface._seen) <= surface.MAX_SESSIONS
