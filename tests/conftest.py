"""Load the plugin the way Hermes does: its folder imported as one package (`hermes_genui`), so core/, tools/, hooks/
and blocks/ keep their relative imports. Tests then import its modules by name, e.g.
importlib.import_module("hermes_genui.core.store"). The plugin folder itself is not put on sys.path, so its
package names (tools, core, ...) can't shadow Hermes's own."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def load_plugin_package():
    """Import this folder as the package `hermes_genui`, the way Hermes loads a plugin."""
    import importlib.util

    if "hermes_genui" in sys.modules:
        return sys.modules["hermes_genui"]
    spec = importlib.util.spec_from_file_location(
        "hermes_genui", ROOT / "__init__.py", submodule_search_locations=[str(ROOT)]
    )
    package = importlib.util.module_from_spec(spec)
    sys.modules["hermes_genui"] = package
    spec.loader.exec_module(package)
    return package
