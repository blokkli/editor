import { defineCodeTemplate } from '../defineTemplate'
import { isBlock } from '../../../Collector/Blocks'
import { relative } from 'pathe'
import { toObject } from '../helpers'

export default defineCodeTemplate(
  'edit-components',
  (ctx) => {
    const imports: Record<string, string> = {}
    const proxyComponents = new Map<string, string>()
    const diffComponents = new Map<string, string>()

    for (const file of ctx.blocks.files.values()) {
      if (!file.definition || !isBlock(file.definition)) {
        continue
      }
      const { bundle } = file.definition

      if (file.proxyComponentPath) {
        const importName = 'proxy_' + bundle
        imports[importName] = relative(
          ctx.helper.paths.blokkliBuildDir,
          file.proxyComponentPath,
        )
        proxyComponents.set(bundle, importName)
      } else if (file.diffComponentPath) {
        const importName = 'diff_' + file.definition.bundle
        imports[importName] = relative(
          ctx.helper.paths.blokkliBuildDir,
          file.diffComponentPath,
        )
        diffComponents.set(bundle, importName)
      }
    }

    const importLines = Object.entries(imports)
      .map(([variableName, path]) => {
        return `import ${variableName} from '${path}'`
      })
      .join('\n')
    return `
${importLines}

${toObject('PROXY_COMPONENTS', proxyComponents)}

${toObject('DIFF_COMPONENTS', diffComponents)}
`
  },
  () => {
    return `
export declare const PROXY_COMPONENTS: Record<string, any>
export declare const DIFF_COMPONENTS: Record<string, any>
`
  },
  {
    dependencies: ['block-path'],
  },
)
