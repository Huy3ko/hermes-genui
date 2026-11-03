"""simulate: a formula played over time. Checked strictly before storing; read as a small table off Desktop."""

import importlib

from conftest import load_plugin_package

load_plugin_package()
check_blocks = importlib.import_module("hermes_genui.core.check").check_blocks
calculator = importlib.import_module("hermes_genui.blocks.calculator")
tf = importlib.import_module("hermes_genui.hooks.text_fallback")

SIM = {
    "type": "simulate", "title": "₹1,00,000 left alone for 30 years",
    "t": {"name": "years", "to": 30, "step": 1, "unit": "years", "speed": 1.25},
    "inputs": [{"name": "rate", "label": "Interest per year", "min": 6, "max": 14, "step": 0.5, "value": 10,
                "unit": "%"}],
    "values": {"P": 100000},
    "view": {"kind": "dots", "per": 10000, "start": "₹1,00,000 you put in", "piles": [
        {"name": "Simple interest", "formula": "P * (1 + rate / 100 * years)", "adds": "interest"},
        {"name": "Compound interest", "formula": "P * (1 + rate / 100) ^ years", "adds": "interest on interest"},
    ]},
    "unit": "₹",
}


def with_(**changes) -> dict:
    return {**SIM, **changes}


def test_a_good_simulation_passes():
    assert check_blocks([SIM]) == []
    grows = [{"name": "Grows", "formula": "max(P, P * 1.1 ^ years)"}]
    chart = with_(view={"kind": "chart", "series": grows}, inputs=[])
    assert check_blocks([chart]) == []


def test_time_is_checked_strictly():
    assert '0.inputs.0: name "rate" is used twice' in check_blocks([with_(t={"name": "rate", "to": 30})])
    assert check_blocks([with_(t={"name": "emi", "to": 30})]) == ['0.t: t name "emi" is a helper\'s name']
    assert check_blocks([with_(t={"name": "years", "to": 0})]) == ["0.t: t needs a name, to > 0 and step > 0"]
    backwards = {"name": "years", "to": 30, "step": -1}
    assert check_blocks([with_(t=backwards)]) == ["0.t: t needs a name, to > 0 and step > 0"]
    assert check_blocks([with_(t={"name": "years", "to": 5000, "step": 1})]) == ["0.t: t takes at most 1000 steps"]
    assert check_blocks([with_(t={"name": "years", "to": 30, "speed": 0})]) == ["0.t: speed is a number above 0"]
    assert check_blocks([with_(t={"name": "years", "to": 30, "unit": "u" * 13})]) == [
        "0.t: unit is text of at most 12 characters"]
    assert check_blocks([with_(t="years")]) == ["0.t: t needs a name, to > 0 and step > 0"]


def test_inputs_and_values_are_checked_strictly():
    five = [{"name": f"x{i}", "max": 10} for i in range(5)]
    assert check_blocks([with_(inputs=five)]) == ["0: simulate takes at most 4 inputs"]
    problems = check_blocks([with_(inputs=[{"name": "rate", "min": 5, "max": 5}, {"name": "Two words"}])])
    assert problems == ["0.inputs.0: input's max must be above its min", '0.inputs.1: input needs a name like "rate"']
    assert check_blocks([with_(inputs=[*SIM["inputs"], {"name": "P"}])]) == ['0.inputs.1: name "P" is used twice']
    assert check_blocks([with_(values={"P": "lots"})]) == ['0.values: values maps names to numbers: {"P": 100000}']
    assert check_blocks([with_(values={f"v{i}": 1 for i in range(9)})]) == ["0.values: at most 8 values"]
    assert check_blocks([with_(values={"max": 1})]) == ['0.values: name "max" is a helper\'s name']
    assert check_blocks([with_(values={"years": 1})]) == ['0.values: name "years" is already a name']


def test_view_and_formulas_are_checked_strictly():
    piles = SIM["view"]["piles"]
    assert check_blocks([with_(view={"kind": "bars", "piles": piles})]) == ['0.view: kind is "dots" or "chart"']
    assert check_blocks([with_(view={"kind": "dots", "per": 0, "piles": piles})]) == ["0.view: per is a number above 0"]
    assert check_blocks([with_(view={"piles": []})]) == ["0.view: view needs 1-3 piles"]
    assert check_blocks([with_(view={"piles": piles * 2})]) == ["0.view: view needs 1-3 piles"]
    bad = [
        {"name": "Unknown", "formula": "P * q"},
        {"name": "Call", "formula": "fetch(P)"},
        {"name": "Odd", "formula": "P.constructor"},
    ]
    assert check_blocks([with_(view={"piles": bad})]) == [
        '0.view.piles.0: formula uses "q", which is not t, an input or a value',
        '0.view.piles.1: formula calls "fetch", which is not a helper',
        "0.view.piles.2: formula can't be read: only numbers, names, + - * / ^ ( ), comparisons and helpers",
    ]
    assert check_blocks([with_(view={"piles": [{"name": "Open", "formula": "(P * 2"}, {"formula": "P"}]})]) == [
        "0.view.piles.0: formula's brackets don't match",
        "0.view.piles.1: pile needs a name of at most 40 characters and a formula",
    ]
    assert check_blocks([with_(view={"piles": [{"name": "N", "formula": "P", "adds": "a" * 41}]})]) == [
        "0.view.piles.0: adds is text of at most 40 characters"]
    assert check_blocks([with_(title="t" * 81, unit="u" * 13, source="s" * 121)]) == [
        "0: title is text of at most 80 characters",
        "0: unit is text of at most 12 characters",
        "0: source is text of at most 120 characters",
    ]


def test_powers_are_worked_out_only_when_asked():
    assert calculator.arithmetic("2 ^ 10", {}) is None
    assert calculator.arithmetic("2 ^ 10", {}, powers=True) == 1024
    assert calculator.arithmetic("-2 ^ 2", {}, powers=True) == -4
    assert calculator.arithmetic("2 ^ 3 ^ 2", {}, powers=True) == 512
    assert calculator.arithmetic("(-8) ^ 0.5", {}, powers=True) is None
    assert calculator.arithmetic("10 ^ 400", {}, powers=True) is None


def test_text_is_a_table_at_five_points_in_time():
    assert tf.blocks_as_text([SIM]) == (
        "**₹1,00,000 left alone for 30 years**\n"
        "With Interest per year 10%:\n"
        "| years | Simple interest | Compound interest |\n"
        "| --- | --- | --- |\n"
        "| 0 | 100,000 ₹ | 100,000 ₹ |\n"
        "| 8 | 180,000 ₹ | 214,359 ₹ |\n"
        "| 15 | 250,000 ₹ | 417,725 ₹ |\n"
        "| 23 | 330,000 ₹ | 895,430 ₹ |\n"
        "| 30 | 400,000 ₹ | 1,744,940 ₹ |"
    )


def test_text_shows_a_dash_where_a_formula_needs_a_helper():
    sim = with_(inputs=[], view={"piles": [{"name": "Capped", "formula": "min(P, 5)"}]}, title=None, unit=None)
    lines = tf.blocks_as_text([sim]).splitlines()
    assert lines[:2] == ["| years | Capped |", "| --- | --- |"]
    assert lines[2] == "| 0 | – |"
