import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import {
  chartTypeEnum,
  chartColorEnum,
  chartSeriesSchema,
  findChartOptionKey,
  numberFormatSchema,
  dateFormatSchema,
} from '../chart_schemas'
import { getDefaultChartData } from '../../../helpers'

const paramsSchema = z.object({
  uuid: z.string().describe('UUID of the chart paragraph'),
})

const resultSchema = z.object({
  title: z.string().describe('Chart title'),
  type: chartTypeEnum.describe('Chart type'),
  categories: z.array(z.string()).describe('Category labels'),
  series: z
    .array(chartSeriesSchema.required())
    .describe('Data series with colors'),
  categoryColors: z.array(chartColorEnum).describe('Color IDs per category'),
  footnotes: z.array(z.string()).describe('Footnote texts'),
  typeOptions: z
    .record(
      z.string(),
      z.union([z.string(), z.boolean(), z.number(), z.null()]),
    )
    .describe('Current type-specific rendering options'),
  numberFormat: numberFormatSchema
    .optional()
    .describe('Number formatting (if set on the chart).'),
  dateFormat: dateFormatSchema
    .optional()
    .describe('Date formatting (if set on the chart).'),
  dataSource: z
    .object({
      id: z.string(),
      label: z.string(),
    })
    .optional()
    .describe(
      'Dynamic data source bound to this chart. When set, inline categories/series are ignored at render time and update_chart refuses to change them.',
    ),
})

export default defineBlokkliAgentTool({
  name: 'get_chart_data',
  description:
    'Get the current data of a chart. Returns chart type, categories, series, colors, footnotes, typeOptions, optional number/date formatting, and any bound dynamic data source. Use this to inspect a chart before updating it.',
  category: 'query',
  volatile: true,
  prunedSummary: (r) => `chart data (${r.type})`,
  modes: ['readonly', 'editing', 'translating', 'review'],
  lazy: true,
  label($t) {
    return $t('aiAgentGetChartDataRunning', 'Getting chart data', {
      more: true,
    })
  },
  paramsSchema,
  resultSchema,
  execute(ctx, params) {
    const { state, $t } = ctx.app
    const options = ctx.app.config.colorOptions.value

    const chartOption = findChartOptionKey(ctx, params.uuid)
    if ('error' in chartOption) return chartOption

    const item = state.getFieldListItem(params.uuid)
    const rawData =
      state.mutatedOptions[params.uuid]?.[chartOption.key] ||
      item?.options?.[chartOption.key]
    let data
    if (rawData) {
      try {
        data = JSON.parse(rawData)
      } catch {
        data = getDefaultChartData(options)
      }
    } else {
      data = getDefaultChartData(options)
    }

    // The `advanced` chart type stores raw ECharts config with no structured
    // categories/series the agent can reason about. Refuse rather than
    // return a broken payload (the result enum also excludes it).
    if (data.type === 'advanced') {
      return {
        error: `Chart "${params.uuid}" uses the "advanced" chart type, which stores raw ECharts JSON. Use get_advanced_chart_config to read it, update_advanced_chart to change it.`,
      }
    }

    return {
      result: {
        title: data.title || '',
        type: data.type,
        categories: data.categories,
        series: data.series,
        categoryColors: data.categoryColors || [],
        footnotes: data.footnotes || [],
        typeOptions: data.typeOptions || {},
        ...(data.numberFormat ? { numberFormat: data.numberFormat } : {}),
        ...(data.dateFormat ? { dateFormat: data.dateFormat } : {}),
        ...(data.dataSource
          ? {
              dataSource: {
                id: data.dataSource.id,
                label: data.dataSource.label,
              },
            }
          : {}),
      },
      label: $t('aiAgentGetChartDataDone', 'Got chart data'),
      affectedUuids: [params.uuid],
    }
  },
})
