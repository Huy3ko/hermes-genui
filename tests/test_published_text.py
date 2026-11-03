"""What the catalog's install scanner reads: published files hold no invisible characters and no example that points
at private files, so its warnings stay for real findings."""

import re

from conftest import ROOT

# Never published (see .gitignore) or not ours.
SKIP = {"docs", ".superpowers", ".claude", ".playwright-mcp", "node_modules", "__pycache__", ".git", ".pytest_cache",
        ".ruff_cache"}
SUFFIXES = {".py", ".md", ".yaml", ".json", ".ts", ".tsx", ".js", ".css"}
# C0/C1 controls (but tab, newline and carriage return), zero-width marks, bidi controls and the byte-order mark.
INVISIBLE = re.compile("[\\x00-\\x08\\x0b\\x0c\\x0e-\\x1f\\x7f-\\x9f\\u200b-\\u200f\\u202a-\\u202e\\u2060-\\u2064"
                       "\\u2066-\\u2069\\ufeff]")
PRIVATE_KEYS = re.compile(r"~/\.ssh|\bid_rsa\b")


def published() -> list:
    return sorted(p for p in ROOT.rglob("*") if p.is_file() and p.suffix in SUFFIXES
                  and not SKIP & set(p.relative_to(ROOT).parts) and p.name != "HANDOVER.md")


def test_there_are_files_to_check():
    names = {p.relative_to(ROOT).as_posix() for p in published()}
    assert {"plugin.yaml", "blocks/common.py", "web/src/core/fields.ts", "desktop/plugin.js"} <= names


def test_no_invisible_characters():
    found = [f"{p.relative_to(ROOT)}:{number}: {ascii(hit.group())}" for p in published()
             for number, line in enumerate(p.read_text(encoding="utf-8").splitlines(), start=1)
             if (hit := INVISIBLE.search(line))]
    assert found == [], "write these as escapes"


def test_examples_never_point_at_private_keys():
    # Tests keep their realistic attack strings; code and docs use a harmless example such as @file:notes.txt.
    code = [p for p in published() if "tests" not in p.relative_to(ROOT).parts and ".test." not in p.name]
    assert [str(p.relative_to(ROOT)) for p in code if PRIVATE_KEYS.search(p.read_text(encoding="utf-8"))] == []
