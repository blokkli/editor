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
import type { UpdateCompositionEvent } from '#blokkli/composition/adapter'
import wrongLanguageAnalyzer from './blokkli/analyzers/wrongLanguage'

export default defineBlokkliEditAdapter(async (ctx) => {
  const adapter = await drupalAdapter(ctx)

  return {
    ...adapter,

    getAnalyzers: () => [
      readabilityAnalyzer(),
      altTextAnalyzer(),
      headingStructureAnalyzer(),
      axeAnalyzer(),
      wrongLanguageAnalyzer(),
    ],

    // The columns of the widest content container (container-wide).
    getGridMarkup: () =>
      `<div class="container-wide grid h-full grid-cols-12 gap-grid">${'<div class="h-full bg-primary/10"></div>'.repeat(12)}</div>`,

    // A composition's source and its children in one mutation
    // (blokkli_playground's update_composition). A reference's value becomes
    // its target id, as in pbAddMultipleParagraphs.
    updateComposition: (e: UpdateCompositionEvent) =>
      useGraphqlMutation('pbUpdateComposition', {
        entityType: ctx.value.entityType.toUpperCase() as never,
        entityUuid: ctx.value.entityUuid,
        langcode: ctx.value.language,
        uuid: e.uuid,
        optionKey: e.optionKey,
        value: e.value,
        fieldName: e.fieldName,
        children: JSON.stringify(
          e.children.map((child) => ({
            uuid: child.blockUuid,
            bundle: child.bundle,
            options: child.options ?? {},
            values: Object.fromEntries(
              (child.values ?? []).map((entry) => [
                entry.fieldName,
                typeof entry.fieldValue === 'string'
                  ? entry.fieldValue
                  : { target_id: entry.fieldValue.entityId },
              ]),
            ),
          })),
        ),
      }).then((v) => {
        const action = v.data?.state?.action
        return {
          success: !!action?.success,
          state: action?.state,
          errors: (action?.errors ?? []).filter((e): e is string => !!e),
          violations: action?.violations ?? [],
        }
      }),

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
