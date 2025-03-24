import { defineCodeTemplate } from '../defineTemplate'
import { isBlock } from '../../../Collector/Blocks'
import { toImports, toObject } from '../helpers'

export default defineCodeTemplate(
  'definitions',
  (ctx) => {
    const definitions: string[] = []
    const blocks: string[] = []
    const fragments: string[] = []
    const icons = new Map<string, string>()
    const imports = new Map<string, string>()

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
          imports.set(iconVariable, file.iconPath + '?raw')
          icons.set(file.definition.bundle, iconVariable)
        }
      } else {
        fragments.push(file.identifier)
      }
    }
    return `
${toImports(imports)}

${definitions.join('\n')}

export const blocks = [
  ${blocks.join(',\n  ')}
]

export const fragments = [
  ${fragments.join(',\n  ')}
]

${toObject('icons', icons)}

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
import type { GlobalOptionsKey, ValidFieldListTypes, BlockBundleWithNested } from '#blokkli-build/generated-types'
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
