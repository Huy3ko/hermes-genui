import importlib.util

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from conftest import ROOT


@pytest.fixture
def client(tmp_path, monkeypatch):
    spec = importlib.util.spec_from_file_location("hb_plugin_api", ROOT / "dashboard" / "plugin_api.py")
    api = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(api)
    monkeypatch.setattr(api.store, "default_root", lambda: tmp_path)
    app = FastAPI()
    app.include_router(api.router)
    return TestClient(app), api


def test_api_returns_blocks(client, tmp_path):
    http, api = client
    block_id = api.store.save([{"type": "text", "text": "hi"}], root=tmp_path)
    response = http.get(f"/blocks/{block_id}")
    assert response.status_code == 200
    assert response.json() == {"blocks": [{"type": "text", "text": "hi"}]}


def test_api_404_for_unknown(client):
    http, _ = client
    response = http.get("/blocks/0badc0de")
    assert response.status_code == 404
    assert response.json() == {"error": "not found"}


def test_state_is_empty_until_saved_then_comes_back(client, tmp_path):
    http, api = client
    block_id = api.store.save([{"type": "checklist", "items": ["Passport", "Tickets"]}], root=tmp_path)
    assert http.get(f"/blocks/{block_id}/state").json() == {}
    response = http.put(f"/blocks/{block_id}/state", json={"state": {"0": [1]}})
    assert response.status_code == 200
    assert http.get(f"/blocks/{block_id}/state").json() == {"state": {"0": [1]}}


def test_state_404_for_bad_or_unknown_ids(client):
    http, _ = client
    for bad in ("0badc0de", "NOPE1234"):
        assert http.get(f"/blocks/{bad}/state").status_code == 404
        assert http.put(f"/blocks/{bad}/state", json={"state": {}}).status_code == 404


def test_state_413_when_too_big(client, tmp_path):
    http, api = client
    block_id = api.store.save([{"type": "text", "text": "hi"}], root=tmp_path)
    response = http.put(f"/blocks/{block_id}/state", json={"state": {"0": "x" * 30_000}})
    assert response.status_code == 413


def test_state_400_when_not_an_object(client, tmp_path):
    http, api = client
    block_id = api.store.save([{"type": "text", "text": "hi"}], root=tmp_path)
    assert http.put(f"/blocks/{block_id}/state", json={"state": [1, 2]}).status_code == 400
    assert http.put(f"/blocks/{block_id}/state", json=[1]).status_code == 400


def test_an_unreadable_board_is_404_not_500(client, tmp_path):
    http, _ = client
    (tmp_path / "0badc0de.json").write_text("[{not json", encoding="utf-8")
    assert http.get("/blocks/0badc0de").status_code == 404
    assert http.get("/blocks/0badc0de/state").status_code == 404


def test_state_body_over_32kb_is_413_before_it_is_read(client, tmp_path):
    http, api = client
    block_id = api.store.save([{"type": "text", "text": "hi"}], root=tmp_path)
    response = http.put(f"/blocks/{block_id}/state", json={"state": {}, "padding": "x" * (40 * 1024)})
    assert response.status_code == 413
    assert http.get(f"/blocks/{block_id}/state").json() == {}


def test_state_body_without_a_length_is_cut_off_at_32kb(client, tmp_path):
    http, api = client
    block_id = api.store.save([{"type": "text", "text": "hi"}], root=tmp_path)

    def chunks():
        yield b'{"state": {}, "padding": "'
        for _ in range(40):
            yield b"x" * 1024
        yield b'"}'

    response = http.put(f"/blocks/{block_id}/state", content=chunks(), headers={"content-type": "application/json"})
    assert response.status_code == 413
    assert http.get(f"/blocks/{block_id}/state").json() == {}

