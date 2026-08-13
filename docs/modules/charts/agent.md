# Agent Integration

When the [agent module](/modules/agent/overview) is enabled alongside the charts
module, the AI assistant can read, create, and edit charts. The charts module
ships its own agent **skill** and **tools** under its `blokkli/` directory,
which are discovered automatically — no extra wiring is needed.

## The `charts` skill

The module registers a skill named `charts`. Skills are loaded on demand: the
LLM pulls in the charts skill when the user asks about charts or when a chart
needs to be created or edited. Loading it injects chart-specific guidance and
makes the chart tools available.

See [Custom Skills](/modules/agent/custom-skills) for how the skill system works
in general.

## Tools

The skill exposes seven tools — four for structured charts and three for
`advanced` (raw ECharts) charts:

| Tool                        | Kind     | Purpose                                                                                                                               |
| --------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `get_chart_data`            | query    | Read a chart's current state (type, categories, series, colors, `typeOptions`, and `dataSource` if bound). Called first before edits. |
| `create_chart`              | mutation | Create a structured chart. Auto-detects which bundle in the target field has a chart option.                                          |
| `update_chart`              | mutation | Update an existing chart — pass only the properties to change.                                                                        |
| `get_chart_type_options`    | query    | List the available `typeOptions` for a chart type (with defaults and allowed values).                                                 |
| `create_advanced_chart`     | mutation | Create an `advanced` chart from a raw ECharts option object.                                                                          |
| `update_advanced_chart`     | mutation | Replace the ECharts config on an advanced chart (full replacement, not a merge).                                                      |
| `get_advanced_chart_config` | query    | Read the ECharts config of an advanced chart.                                                                                         |

## How it works

- **Block detection** — chart blocks are identified by the
  [`dataType: 'chart'`](/modules/charts/setup#declare-a-chart-block) option, so
  the tools find the right option key and bundle automatically. The agent does
  not need to know your bundle name.
- **Colors** — series and category colors use the project's configured color
  IDs, exposed to the tools as enum values. They are auto-assigned when omitted.
- **Structured vs advanced are separate** — `advanced` is not part of the type
  enum used by the structured tools. The agent cannot convert between the two;
  to switch, the chart is deleted and recreated.
- **Dynamic data sources are read-only to the agent** — when `get_chart_data`
  reports a bound `dataSource`, `update_chart` refuses changes to `categories`
  or `series` (the source must be unbound in the editor first). Other fields
  (title, type, `typeOptions`, footnotes, number/date format) stay editable.
- **Nullable options** — options like `yaxisMin` and `agePyramid`'s `splitIndex`
  can be reset to "auto" by passing `null`.

## See also

- [Agent — Overview](/modules/agent/overview)
- [Agent — Custom Skills](/modules/agent/custom-skills)
- [Chart Types](/modules/charts/chart-types) — the `typeOptions` the agent can
  set
