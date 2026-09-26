import { defineBlokkliEditAdapter } from '#blokkli/editor/adapter'
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
      `<div class="mx-auto grid h-full max-w-5xl grid-cols-12 gap-4 px-4">${'<div class="h-full bg-red-500/10"></div>'.repeat(12)}</div>`,
  }
})
