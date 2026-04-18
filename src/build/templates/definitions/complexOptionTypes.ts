import { defineCodeTemplate } from '../defineTemplate'

export default defineCodeTemplate(
  'complex-option-types',
  (ctx) => {
    const types = ctx.getComplexOptionTypes()

    if (types.length === 0) {
      return `export const COMPLEX_OPTION_TYPES = {}`
    }

    const entries = types
      .map(
        (t) =>
          `  '${t.id}': {
    editorComponent: defineAsyncComponent(() => import('${ctx.helper.toModuleBuildRelative(t.editorComponentPath)}')),
    editTitle: ${JSON.stringify(t.editTitle)},
    editorIcon: '${t.editorIcon}',
  }`,
      )
      .join(',\n')

    return `import { defineAsyncComponent } from 'vue'

export const COMPLEX_OPTION_TYPES = {
${entries}
}`
  },
  (ctx) => {
    const types = ctx.getComplexOptionTypes()

    if (types.length === 0) {
      return `export interface ComplexOptionTypeMap {}
export const COMPLEX_OPTION_TYPES: Record<string, never>`
    }

    const imports = types
      .map(
        (t) =>
          `import type { ${t.typeName} } from '${ctx.helper.toModuleBuildRelative(t.typePath)}'`,
      )
      .join('\n')

    const entries = types.map((t) => `  '${t.id}': ${t.typeName}`).join('\n')

    return `${imports}
import type { BlokkliIcon } from './icons'
import type { Component } from 'vue'

export interface ComplexOptionTypeMap {
${entries}
}

export const COMPLEX_OPTION_TYPES: Record<string, {
  editorComponent: Component
  editTitle: { key: string; defaultTranslation: string }
  editorIcon: BlokkliIcon
}>`
  },
  {
    write: true,
  },
)
