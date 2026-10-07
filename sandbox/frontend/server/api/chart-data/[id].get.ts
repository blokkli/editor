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
    categories: dataset.categories.map((category) => localize(category, lang)),
    series: dataset.series.map((series) => ({
      name: localize(series.name, lang),
      data: series.data,
    })),
  }
})
