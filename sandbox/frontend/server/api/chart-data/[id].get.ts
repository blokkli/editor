import type { ChartDataSourcePayload } from '#blokkli/charts/types'

/**
 * A chart data source's data in a language: for the editor's preview
 * (getChartDataSourceData) and the chart paragraph.
 */
export default defineEventHandler((event) => {
  const dataset = CHART_DATA[getRouterParam(event, 'id') ?? '']
  if (!dataset) {
    throw createError({ statusCode: 404 })
  }
  const { language } = getQuery(event)
  const lang = isLanguage(language) ? language : DEFAULT_LANGUAGE
  return {
    categories: dataset.categories.map((category) =>
      localizeName(category, lang),
    ),
    series: dataset.series.map((series) => {
      const { key, label } = localizeName(series.name, lang)
      return { key, name: label, data: series.data }
    }),
  } satisfies ChartDataSourcePayload
})
