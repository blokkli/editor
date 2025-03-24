import { defineCodeTemplate } from '../defineTemplate'
import { isBlock } from '../../../Collector/Blocks'
import { toObject } from '../helpers'

export default defineCodeTemplate(
  'definitions',
  (ctx) => {
    const definitions: string[] = []
    const blocks: string[] = []
    const fragments: string[] = []
    const icons = new Map<string, string>()

    // Iterate over all collected blocks.
    for (const file of ctx.blocks.files.values()) {
      if (!file.definition || !file.definitionSource || !file.identifier) {
        continue
      }
      definitions.push(`const ${file.identifier} = ${file.definitionSource}`)
      if (isBlock(file.definition)) {
        blocks.push(file.identifier)
        if (file.iconContents) {
          icons.set(file.definition.bundle, JSON.stringify(file.iconContents))
        }
      } else {
        fragments.push(file.identifier)
      }
    }
    return `
${definitions.join('\n')}

const blocks = [
  ${blocks.join(',\n  ')}
]

const fragments = [
  ${fragments.join(',\n  ')}
]

${toObject('icons', icons, true)}

const globalOptions = ${JSON.stringify(ctx.helper.options.globalOptions || {})}

const definitions = {
  blocks,
  fragments,
  icons,
  globalOptions,
}

export default definitions
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
import type { GlobalOptionsKey, ValidFieldListTypes, BlockBundleWithNested, ValidGlobalConfigKeys } from '#blokkli-build/generated-types'
import type { BlockDefinitionInput, BlockDefinitionOptionsInput, FragmentDefinitionInput } from '${ctx.helper.relativePaths.TYPES}'

export type BlockDefinition = BlockDefinitionInput<BlockDefinitionOptionsInput, GlobalOptionsKey[]>
export type FragmentDefinition = FragmentDefinitionInput<Record<string, any>, GlobalOptionsKey[]>

export type BlokkliFragmentName = ${fragmentNames.join(' | ') || 'never'}

const globalOptions = ${JSON.stringify(ctx.helper.options.globalOptions || {})} as const

export type GlobalOptionsType = typeof globalOptions

export type Definitions = {
  blocks: BlockDefinition[]
  fragments: FragmentDefinition[]
  icons: Record<string, string>
  globalOptions: BlockDefinitionOptionsInput
}

const definitions: Definitions

export default definitions
`
  },
  {
    dependencies: ['block-content', 'block-path'],
  },
)
