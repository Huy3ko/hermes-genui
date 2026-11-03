"""Every block type the plugin knows, in one place: its checker (run before a board is stored, so the model can fix
mistakes in the same turn) and its text rendering (for chat apps that can't draw blocks). core/check.py and
hooks/text_fallback.py look types up here, so a type missing here is unknown.

    check_<x>(block, path) → [(path, why), ...]   (empty when the block can be drawn)
    text_<x>(block) → Markdown, or "" when nothing in it reads as text

The layout types (row, section, grid, columns, tabs) hold other blocks, so theirs take more: see layout.py.
Adding a type: a module here with check_<x> and text_<x>, and one line in TYPES (see CONTRIBUTING.md).
"""

from .actions import check_actions, check_button, text_actions, text_button
from .atoms import (
    check_badge,
    check_bar,
    check_divider,
    check_heading,
    check_image,
    check_link,
    check_text,
    text_badge,
    text_bar,
    text_divider,
    text_heading,
    text_image,
    text_link,
    text_text,
)
from .calculator import check_calculator, text_calculator
from .callout import check_callout, text_callout
from .chart import check_chart, text_chart
from .checklist import check_checklist, text_checklist
from .flip import check_flip, text_flip
from .flow import check_flow, text_flow
from .form import check_form, text_form
from .heatmap import check_heatmap, text_heatmap
from .images import check_images, text_images
from .include import check_include, text_include
from .kpis import check_kpis, check_stat, text_kpis, text_stat
from .layers import check_layers, text_layers
from .layout import check_container, check_tabs, text_container, text_tabs
from .list import check_list, text_list
from .progress import check_progress, text_progress
from .simulate import check_simulate, text_simulate
from .source import check_source, text_source
from .steps import check_steps, text_steps
from .streak import check_streak, text_streak
from .table import check_table, text_table
from .tiles import check_tiles, text_tiles
from .timeline import check_timeline, text_timeline

TYPES = {
    "chart": (check_chart, text_chart),
    "kpis": (check_kpis, text_kpis),
    "timeline": (check_timeline, text_timeline),
    "images": (check_images, text_images),
    "table": (check_table, text_table),
    "callout": (check_callout, text_callout),
    "source": (check_source, text_source),
    "list": (check_list, text_list),
    "progress": (check_progress, text_progress),
    "streak": (check_streak, text_streak),
    "heatmap": (check_heatmap, text_heatmap),
    "flip": (check_flip, text_flip),
    "actions": (check_actions, text_actions),
    "tiles": (check_tiles, text_tiles),
    "checklist": (check_checklist, text_checklist),
    "calculator": (check_calculator, text_calculator),
    "simulate": (check_simulate, text_simulate),
    "form": (check_form, text_form),
    "flow": (check_flow, text_flow),
    "steps": (check_steps, text_steps),
    "layers": (check_layers, text_layers),
    "row": (check_container, text_container),
    "section": (check_container, text_container),
    "grid": (check_container, text_container),
    "columns": (check_container, text_container),
    "tabs": (check_tabs, text_tabs),
    "include": (check_include, text_include),
    "heading": (check_heading, text_heading),
    "text": (check_text, text_text),
    "stat": (check_stat, text_stat),
    "divider": (check_divider, text_divider),
    "badge": (check_badge, text_badge),
    "link": (check_link, text_link),
    "button": (check_button, text_button),
    "image": (check_image, text_image),
    "bar": (check_bar, text_bar),
}
