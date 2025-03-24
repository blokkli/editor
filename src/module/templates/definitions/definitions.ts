import { defineCodeTemplate } from '../defineTemplate'
import { relative } from 'pathe'
import { isBlock } from '../../../Collector/Blocks'

export default defineCodeTemplate(
  'definitions',
  (ctx) => {
    const definitions: string[] = []
    const blocks: string[] = []
    const fragments: string[] = []
    const icons: string[] = []
    const imports: string[] = []

    // Iterate over all collected blocks.
    for (const file of ctx.blocks.files.values()) {
      if (!file.definition || !file.definitionSource || !file.identifier) {
        continue
      }
      definitions.push(`const ${file.identifier} = ${file.definitionSource}`)
      if (isBlock(file.definition)) {
        blocks.push(file.identifier)
        if (file.iconPath) {
          const iconVariable = 'icon_' + file.definition.bundle
          const relativePath = relative(
            ctx.helper.paths.blokkliBuildDir,
            file.iconPath,
          )
          imports.push(`import ${iconVariable} from '${relativePath}?raw'`)
          icons.push(`${file.definition.bundle}: ${iconVariable}`)
        }
      } else {
        fragments.push(file.identifier)
      }
    }
    return `
${imports.join('\n')}

${definitions.join('\n')}

export const blocks = [
  ${blocks.join(',\n  ')}
]

export const fragments = [
  ${fragments.join(',\n  ')}
]

export const icons = {
  ${icons.join(',\n  ')}
}

export const globalOptions = ${JSON.stringify(ctx.helper.options.globalOptions || {})}
`
  },
  (ctx) => {
    const fragmentNames: string[] = []

    for (const file of ctx.blocks.files.values()) {
      if (!file.definition) {
        continue
      }
      if (isBlock(file.definition)) {
        continue
      }

      fragmentNames.push(`'${file.definition.name}'`)
    }

    return `
import type { GlobalOptionsKey, ValidFieldListTypes, BlockBundleWithNested } from './generated-types'
import type { BlockDefinitionInput, BlockDefinitionOptionsInput, FragmentDefinitionInput } from '${ctx.helper.relativePaths.TYPES}'

export type BlockDefinition = BlockDefinitionInput<BlockDefinitionOptionsInput, GlobalOptionsKey[]>
export type FragmentDefinition = FragmentDefinitionInput<Record<string, any>, GlobalOptionsKey[]>

export type BlokkliFragmentName = ${fragmentNames.join(' | ') || 'never'}

export declare const blocks: BlockDefinition[]
export declare const fragments: FragmentDefinition[]

export declare const icons: Record<string, string>

export declare const globalOptions: BlockDefinitionOptionsInput
`
  },
  {
    dependencies: ['block-content', 'block-path'],
  },
)
