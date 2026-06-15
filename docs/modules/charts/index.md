# Charts Overview

The charts module adds a `chart` block option that stores structured chart data,
plus a renderer that draws it with [ECharts](https://echarts.apache.org/). It
ships ten built-in chart types and an extensible system for adding your own.

## What the module provides

- **A `chart` complex option** — attach it to a block to store a full chart
  (type, series, categories, colors, formatting, translations).
- **Ten built-in chart types** — `bar`, `line`, `area`, `pie`, `donut`,
  `radar`, `heatmap`, `radialBar`, `agePyramid`, and a raw `advanced` (ECharts
  config) type.
- **`ChartRenderer`** — a runtime component that resolves the stored data
  (translations, date/number formatting, color IDs, dynamic-data overrides) and
  dispatches to the type-specific render component.
- **Dynamic data sources** — bind a chart to backend-provided data through the
  adapter instead of inline data.
- **Custom chart types** — register your own via the `blokkli/chart-types/`
  convention.
- **Agent tools** — when the agent module is also enabled, a `charts` skill lets
  the AI assistant create and edit charts.

## How it works

The module registers a complex block option of type `chart` (backed by the
[`BlokkliChartData`](/modules/charts/setup#data-model) type). A block opts in by
declaring a `json` option with `dataType: 'chart'`; editors then get the chart
editor, and your block component renders the value with `ChartRenderer`.

Built-in chart types live under the module's own `blokkli/chart-types/`
directory and are discovered at build time by the `ChartTypeCollector` — the same
collector that picks up your project's custom types, so the module consumes the
exact convention it offers to userland.

## Next steps

- [Setup](/modules/charts/setup) — enable the module, declare a chart block, and
  render it
- [Chart Types](/modules/charts/chart-types) — the built-in types and their
  options
- [Custom Chart Types](/modules/charts/custom-chart-types) — register your own
- [Data Sources](/modules/charts/data-sources) — bind charts to backend data
- [Agent Integration](/modules/charts/agent) — let the AI assistant edit charts
