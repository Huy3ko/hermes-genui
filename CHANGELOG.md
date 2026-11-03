# Changelog

All notable changes to this plugin. Versions follow [Semantic Versioning](https://semver.org).

## 0.2.0 — first public release

- **About 30 blocks:**
  - **charts:** line with gain/loss colouring, columns that turn sideways for rankings, donut, stacked, area, combo,
    heatmap;
  - **numbers and lists:** KPI cards with trend lines, sortable tables with mini bars;
  - **plans and media:** timelines, checklists that save ticks, photos, tiles, flash cards;
  - **interactive:** calculators with live charts, forms, buttons;
  - **explainers:** flow diagrams whose boxes hold what's in them and send packets as you step, step-by-step
    walkthroughs, simulations you play over time, and stacks drawn in light 3D;
  - **layouts:** columns, grid, tabs, sections, rows.
- **One shared hover card** on every chart, with keyboard support.
- **Short big numbers in the reader's own language:** 4.21B, 4,21 Mrd., ₹18.4L.
- **Recipes** for trips, comparisons, what-ifs, stock dashboards, dashboards, reports, learning, explainers and
  trackers. They install with the plugin and are read-only; a recipe builder saves your own.
- **`market_history`:** prices from Yahoo Finance, as a one-stock board or a comparison of up to 3.
- **`find_photos`:** photos from Wikimedia Commons, Openverse and page images from your web search, plus Unsplash,
  Pexels and Tavily with keys.
  - Fetches are https only and public addresses only, with redirects checked.
  - Recent searches are remembered.
  - A source that fails is rested for 10 minutes.
- **A text fallback** for Telegram, the CLI and other chat apps.
