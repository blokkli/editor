import { defineCodeTemplate } from '../../../../build/templates/defineTemplate'
import type { ChartTypeCollector } from '../ChartTypeCollector'

/**
 * Generates the runtime type → component map used by `ChartRenderer`.
 * Each `render.vue` is wrapped in `defineAsyncComponent` so it's
 * code-split and not loaded until the chart actually mounts.
 */
export default function (collector: ChartTypeCollector) {
  return defineCodeTemplate(
    'charts-components',
    (ctx) => {
      const rel = (p: string) => ctx.helper.toModuleBuildRelative(p)
      const items = collector.getItems()
      const entries = items
        .map(
          (it) =>
            `  '${it.id}': defineAsyncComponent(() => import('${rel(it.renderPath)}')),`,
        )
        .join('\n')

      return `import { defineAsyncComponent } from 'vue'

export const chartTypeComponents = {
${entries}
}
`
    },
    () => `import type { Component } from 'vue'
import type { ChartTypeId } from '#blokkli-build/charts-definitions'

export const chartTypeComponents: Record<ChartTypeId, Component>
`,
    { dependencies: ['chart-types'], write: true },
  )
}
