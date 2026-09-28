import { defineBlokkliEditAdapter } from '#blokkli/editor/adapter'
import type {
  ChartDataSource,
  ChartDataSourcePayload,
} from '#blokkli/charts/types'
import drupalAdapter from '#blokkli/drupal-adapter'
import {
  altTextAnalyzer,
  axeAnalyzer,
  headingStructureAnalyzer,
  readabilityAnalyzer,
} from '#blokkli/analyzer'

export default defineBlokkliEditAdapter(async (ctx) => {
  const adapter = await drupalAdapter(ctx)

  return {
    ...adapter,

    getAnalyzers: () => [
      readabilityAnalyzer(),
      altTextAnalyzer(),
      headingStructureAnalyzer(),
      axeAnalyzer(),
    ],

    // The columns of the widest content container (container-wide).
    getGridMarkup: () =>
      `<div class="container-wide grid h-full grid-cols-12 gap-grid">${'<div class="h-full bg-primary/10"></div>'.repeat(12)}</div>`,

    // The town's chart data (server/api/chart-data), in the editor's
    // language. A short list: the editor filters it.
    getChartDataSourceCapabilities: () => ({ supportsSearch: false }),
    getChartDataSources: () =>
      $fetch<ChartDataSource[]>('/api/chart-data', {
        query: { language: ctx.value.language },
      }),
    getChartDataSourceData: ({ id }: { id: string }) =>
      $fetch<ChartDataSourcePayload>(`/api/chart-data/${id}`, {
        query: { language: ctx.value.language },
      }),
  }
})
