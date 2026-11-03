"""The plugin's tools, and the registry Hermes is given them from. Adding a tool: a module here with a handler
`(params, **kwargs) -> str` and its schema, then one ToolSpec line in TOOLS (see CONTRIBUTING.md)."""

from collections.abc import Callable
from dataclasses import dataclass

from ..core.manifest import NAME
from . import market_history, photos, save_recipe, show_blocks

# The toolset the tools are listed under: the plugin's name in snake case, "hermes-genui" → "hermes_genui".
TOOLSET = NAME.replace("-", "_")


@dataclass(frozen=True)
class ToolSpec:
    """One tool as Hermes registers it: its name, the JSON schema the model reads, and the handler it calls."""

    name: str
    schema: dict
    handler: Callable[..., str]


# Registered in this order.
TOOLS: tuple[ToolSpec, ...] = (
    ToolSpec("show_blocks", show_blocks.SHOW_BLOCKS_SCHEMA, show_blocks.show_blocks),
    ToolSpec("market_history", market_history.MARKET_HISTORY_SCHEMA, market_history.market_history),
    ToolSpec("find_photos", photos.FIND_PHOTOS_SCHEMA, photos.find_photos),
    ToolSpec("save_recipe", save_recipe.SAVE_RECIPE_SCHEMA, save_recipe.save_recipe),
)
