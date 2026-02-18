import { defineBlokkliAgentSkill } from '#blokkli/agent/server/skills'

export default defineBlokkliAgentSkill({
  name: 'charts',
  label: { en: 'Working with charts', de: 'Arbeiten mit Diagrammen' },
  description:
    'How charts work in blökkli. LOAD THIS when the user asks about charts or when you need to create or update a chart! Charts are a special blokkli_fragment.',
  getContents: () => `
# Charts

Charts are implemented as **fragments** with the bundle "blokkli_fragment" and the fragment name "blokkli_chart". When you see a paragraph with bundle "blokkli_fragment" and fragmentName "blokkli_chart", that IS the chart paragraph.

## Key concept

The chart paragraph's UUID is what you pass directly to the chart tools. There is no separate "chart entity" inside the fragment — the fragment IS the chart.

## Available tools

- **get_chart_data**: Read the current chart data (type, categories, series, colors, typeOptions). Always call this first when modifying an existing chart!
- **create_chart**: Create a new chart. Requires chart data (type, categories, series).
- **update_chart**: Update an existing chart. Pass the fragment paragraph's UUID and only the properties you want to change (title, type, categories, series, categoryColors, footnotes, typeOptions).
- **get_chart_type_options**: Get available typeOptions for a chart type. Call this to discover which rendering options exist (e.g. stacked, horizontal for bar charts) before setting typeOptions.

## Workflow

1. To **read** a chart's current state: use get_chart_data with the paragraph UUID.
2. To **create** a chart: use create_chart with the data.
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
