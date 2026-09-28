import { defineEventHandler, getQuery } from 'h3'
import { DEFAULT_LANGUAGE, isLanguage } from '#shared/languages'
import { CHART_DATA, localize } from '../../chartData'

/**
 * The chart data sources, for the editor (getChartDataSources).
 */
export default defineEventHandler((event) => {
  const { language } = getQuery(event)
  const lang = isLanguage(language) ? language : DEFAULT_LANGUAGE
  return Object.entries(CHART_DATA).map(([id, dataset]) => ({
    id,
    label: localize(dataset.label, lang),
    description: localize(dataset.description, lang),
  }))
})
