import { defineBlokkliAgentSkill } from '#blokkli/agent/server/skills'

export default defineBlokkliAgentSkill({
  name: 'charts',
  label: { en: 'Working with charts', de: 'Arbeiten mit Diagrammen' },
  description:
    'How charts work in blökkli. LOAD THIS when the user asks about charts or when you need to create or update a chart!',
  getContents: () => `
# Charts

Charts are NOT a specific block bundle. Instead, charts are a **complex option type**: any block can have a JSON option with \`dataType: 'chart'\`. The chart data is stored as a JSON string in that option. The option key can be anything (e.g. "data", "chart", etc.) — the tools detect it automatically.

## Key concept

A "chart block" is any block whose definition has a JSON option with \`dataType: 'chart'\`. The chart tools automatically detect which option holds chart data, so you don't need to know the option key or bundle name.

## Available tools

- **get_chart_data**: Read the current chart data (type, categories, series, colors, typeOptions). Always call this first when modifying an existing chart!
- **create_chart**: Create a new chart. Requires chart data (type, categories, series). The tool automatically finds which bundle in the target field has a chart option.
- **update_chart**: Update an existing chart. Pass the block's UUID and only the properties you want to change (title, type, categories, series, categoryColors, footnotes, typeOptions).
- **get_chart_type_options**: Get available typeOptions for a chart type. Call this to discover which rendering options exist (e.g. stacked, horizontal for bar charts) before setting typeOptions.

## Workflow

1. To **read** a chart's current state: use get_chart_data with the paragraph UUID.
2. To **create** a chart: use create_chart with the data. The tool finds the right bundle automatically from the target field's allowed bundles.
3. To **modify** a chart: first call get_chart_data to see the current state, then use update_chart with only the properties you want to change.
4. To **change rendering options** (e.g. stacked bars, smooth lines, grid lines): first call get_chart_type_options with the chart type to see available options, then use update_chart with the typeOptions property.

## Chart types

bar, line, pie, area, donut, heatmap, radialBar, radar.

- pie, donut, radialBar: Single-series charts where each category gets its own color (categoryColors).
- bar, line, area, heatmap, radar: Multi-series charts where each series has its own color.

Each chart type has different options!

## Colors

Series colors and category colors use color IDs defined in the project configuration. They are auto-assigned if omitted. The valid color IDs are part of the tool schemas (enum values).
`,
})
