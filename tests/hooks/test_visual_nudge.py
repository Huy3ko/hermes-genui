import importlib

from conftest import load_plugin_package

load_plugin_package()
nudge = importlib.import_module("hermes_genui.hooks.visual_nudge")


def test_visual_asks_get_the_reminder_in_the_desktop_app():
    for ask in ["Create an interesting dashboard of my profiles, rich and interactive",
                "show the analysis visually", "compare Alphabet and Microsoft", "plan 3 days in Lisbon",
                "chart my spending", "how's the market?"]:
        context = nudge.visual_nudge(user_message=ask, platform="local")
        assert context and "show_blocks" in context and "::preview" in context, ask


def test_plain_questions_get_nothing():
    assert nudge.visual_nudge(user_message="what's the capital of Peru?", platform="local") is None


def test_other_surfaces_get_nothing():
    assert nudge.visual_nudge(user_message="make a dashboard", platform="telegram") is None
    assert nudge.visual_nudge(user_message="make a dashboard", platform="cli") is None


def test_multimodal_messages_are_read_from_their_text_parts():
    parts = [{"type": "text", "text": "turn this into a dashboard"}, {"type": "image_url", "image_url": {"url": "x"}}]
    assert nudge.visual_nudge(user_message=parts, platform="local")
