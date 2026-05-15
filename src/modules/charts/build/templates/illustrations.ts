import { defineCodeTemplate } from '../../../../build/templates/defineTemplate'
import type { ChartTypeCollector } from '../ChartTypeCollector'

/**
 * Generates the chart-type id → illustration component map used by the
 * editor's chart-type picker. Illustrations are imported synchronously
 * (no `defineAsyncComponent`) because they're tiny SVG-only SFCs and the
 * picker shows all of them at once when the dialog opens — async-loading
 * each would just cause flicker.
 *
 * Only chart-types that have an `illustration.vue` in their folder are
 * included. The picker falls back to the definition's icon when a type
 * isn't in the map.
 */
export default function (collector: ChartTypeCollector) {
  return defineCodeTemplate(
    'charts-illustrations',
    (ctx) => {
      const rel = (p: string) =>
        ctx.helper.toModuleBuildRelative(p).replace(/\.vue$/, '')
      const items = collector
        .getItems()
        .filter((it) => it.illustrationPath !== null)

      const imports = items
        .map(
          (it) =>
            `import ${it.importName}Illustration from '${rel(it.illustrationPath!)}'`,
        )
        .join('\n')

      const entries = items
        .map((it) => `  '${it.id}': ${it.importName}Illustration,`)
        .join('\n')

      return `${imports}

export const chartTypeIllustrations = {
${entries}
}
`
    },
    () => `import type { Component } from 'vue'
import type { ChartTypeId } from '#blokkli-build/charts-definitions'

export const chartTypeIllustrations: Partial<Record<ChartTypeId, Component>>
`,
    { dependencies: ['chart-types'], write: true },
  )
}
