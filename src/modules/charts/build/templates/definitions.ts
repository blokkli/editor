import { defineCodeTemplate } from '../../../../build/templates/defineTemplate'
import type { ChartTypeCollector } from '../ChartTypeCollector'

/**
 * Imports every chart-type `definition.ts` and re-exports them as
 * `definitions[]` for the registry wrapper. Also generates the
 * `ChartTypeOptionsMap` and `ChartTypeId` types from each definition's
 * exported `TypeOptions`, so adding a new chart type at any registered
 * directory automatically extends the union.
 */
export default function (collector: ChartTypeCollector) {
  return defineCodeTemplate(
    'charts-definitions',
    (ctx) => {
      const rel = (p: string) =>
        ctx.helper.toModuleBuildRelative(p).replace(/\.(ts|js)$/, '')
      const items = collector.getItems()
      const imports = items.map(
        (it) => `import ${it.importName} from '${rel(it.definitionPath)}'`,
      )
      const entries = items.map((it) => `  ${it.importName}`).join(',\n')
      const ids = items.map((it) => `'${it.id}'`).join(', ')

      return `${imports.join('\n')}

export const definitions = [
${entries}
]

export const definitionIds = [${ids}]
`
    },
    (ctx) => {
      const rel = (p: string) =>
        ctx.helper.toModuleBuildRelative(p).replace(/\.(ts|js)$/, '')
      const items = collector.getItems()
      const typeImports = items
        .map(
          (it, i) =>
            `import type { TypeOptions as _Opt${i} } from '${rel(it.definitionPath)}'`,
        )
        .join('\n')
      const mapEntries = items
        .map((it, i) => `  '${it.id}': _Opt${i}`)
        .join('\n')
      const idUnion =
        items.length > 0 ? items.map((it) => `'${it.id}'`).join(' | ') : 'never'

      const header = `import type { ChartTypeDefinitionEntry } from '#blokkli/charts/types'`
      const body = `export const definitions: ChartTypeDefinitionEntry<any>[]
export const definitionIds: readonly (${idUnion})[]

export type ChartTypeOptionsMap = {
${mapEntries}
}
export type ChartTypeId = keyof ChartTypeOptionsMap
`

      return `${header}
${typeImports}

${body}`
    },
    { dependencies: ['chart-types'], write: true },
  )
}
