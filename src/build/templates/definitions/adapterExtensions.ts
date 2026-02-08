import { defineCodeTemplate } from '../defineTemplate'

export default defineCodeTemplate(
  'adapter-extensions',
  (ctx) => {
    const extensions = ctx.getAdapterExtensions()

    if (extensions.length === 0) {
      return `export default []`
    }

    const imports = extensions
      .map(
        (ext, i) =>
          `import ext${i} from '${ctx.helper.toModuleBuildRelative(ext.path)}'`,
      )
      .join('\n')

    return `
${imports}

export default [
  ${extensions.map((ext, i) => `{ namespace: '${ext.namespace}', factory: ext${i} }`).join(',\n  ')}
]
`
  },
  (ctx) => {
    return `
import type { AdapterExtensionDefinition } from '${ctx.helper.toModuleBuildRelative(ctx.helper.resolvers.module.resolve('./runtime/editor/providers/adapters.ts'))}'

const adapterExtensions: AdapterExtensionDefinition[]

export default adapterExtensions
`
  },
  {
    write: true,
  },
)
