import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import {
  chartTypeEnum,
  chartColorEnum,
  chartSeriesSchema,
  findChartOptionKey,
} from '../chart_schemas'
import { COLORS } from '#blokkli-build/charts-config'
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
    .record(z.string(), z.union([z.string(), z.boolean(), z.number()]))
    .describe('Current type-specific rendering options'),
})

export default defineBlokkliAgentTool({
  name: 'get_chart_data',
  description:
    'Get the current data of a chart. Returns the chart type, categories, series, colors, footnotes, and typeOptions. Use this to inspect a chart before updating it.',
  category: 'query',
  volatile: true,
  prunedSummary: (r) => `chart data (${r.type})`,
  modes: ['readonly', 'editing', 'translating', 'review'],
  lazy: true,
  label($t) {
    return $t('aiAgentGetChartDataRunning', 'Getting chart data...')
  },
  paramsSchema,
  resultSchema,
  execute(ctx, params) {
    const { state, $t } = ctx.app

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
        data = getDefaultChartData(COLORS)
      }
    } else {
      data = getDefaultChartData(COLORS)
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
      },
      label: $t('aiAgentGetChartDataDone', 'Got chart data'),
      affectedUuids: [params.uuid],
    }
  },
})
