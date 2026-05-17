import { defineBlokkliAgentSkill } from '#blokkli/agent/server/skills'

export default defineBlokkliAgentSkill({
  name: 'charts',
  label: { en: 'Working with charts', de: 'Arbeiten mit Diagrammen' },
  description:
    'Load this when the user asks about charts or when you need to create or update a chart!',
  tools: [
    'create_chart',
    'update_chart',
    'get_chart_data',
    'get_chart_type_options',
    'create_advanced_chart',
    'update_advanced_chart',
    'get_advanced_chart_config',
  ],
  getContents: () => `
# Charts

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

## IMPORTANT

- DO NOT use the add_paragraph tool for creating charts! Always use create_chart!
- DO NOT use the set_paragraph_option tool for updating charts! Always use update_chart!

## Chart types

bar, line, pie, area, donut, heatmap, radialBar, radar, agePyramid.

- pie, donut, radialBar: Single-series charts where each category gets its own color (categoryColors).
- bar, line, area, heatmap, radar: Multi-series charts where each series has its own color.
- agePyramid: Back-to-back horizontal bars by category. The \`splitIndex\` typeOption picks which series index starts on the right; series before it render on the left. Defaults to half the number of series.

Each chart type has different options!

## Advanced charts (raw ECharts)

There is also an \`advanced\` chart type that stores a raw ECharts option object instead of structured categories/series. It is **not** in the type enum used by \`create_chart\` / \`update_chart\` / \`get_chart_data\` — use the dedicated tools:

- **create_advanced_chart**: Create a new advanced chart from a full ECharts option object.
- **update_advanced_chart**: Replace the ECharts option on an existing advanced chart. The config is a full replacement, not a partial merge — call \`get_advanced_chart_config\` first if you need to read-then-edit. Refuses if the chart is structured.
- **get_advanced_chart_config**: Read the current ECharts option. Refuses if the chart is structured.

Use the advanced tools only when the user needs a chart type or layout not covered by the structured types. The agent **cannot** convert between structured and advanced — to swap, delete the chart and create a new one.

## Colors

Series colors and category colors use color IDs defined in the project configuration. They are auto-assigned if omitted. The valid color IDs are part of the tool schemas (enum values).

## Dynamic data sources

A chart can be bound to a dynamic data source (e.g. a backend-provided dataset). When \`get_chart_data\` returns a \`dataSource\` field, the chart's inline \`categories\` and \`series\` are ignored at render time and replaced with the live data. In this state:

- \`update_chart\` refuses changes to \`categories\` or \`series\` and returns an error — the user has to unbind the data source in the editor first.
- Other fields (title, type, typeOptions, footnotes, numberFormat, dateFormat) remain editable.

## Filterable categories

Many chart types (bar, line, area, heatmap, radar, pie, donut, radialBar) support a \`categoryFilter\` typeOption. When enabled, the chart wrapper renders a category picker so viewers can show one category at a time. The companion \`categoryFilterLabel\` typeOption is a string shown next to the picker.

## Formatting

- \`numberFormat\`: Controls axes, data labels and tooltips. Fields: \`locale\` (BCP-47), \`decimals\` (0-4), \`prefix\`, \`suffix\`, \`notation\` ('standard' | 'compact').
- \`dateFormat.style\`: Applied to category labels that look like dates. Use 'auto' to let the chart pick. Locale is reused from \`numberFormat.locale\`.

## Nullable typeOptions

Some typeOptions (e.g. \`yaxisMin\`, agePyramid's \`splitIndex\`) can be cleared back to "auto" by passing \`null\` for that key in \`typeOptions\`.
`,
})
