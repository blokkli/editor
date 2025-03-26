import { defineCodeTemplate } from '../defineTemplate'
import { isBlock } from '../../../Collector/Blocks'
import { toObject } from '../helpers'
import { toValidVariableName } from './../../../helpers'
import { hash } from 'ohash'

export default defineCodeTemplate(
  'definitions',
  (ctx) => {
    const blocks: string[] = []
    const fragments: string[] = []
    const icons = new Map<string, string>()

    const definitions: string[] = []

    const files = [...ctx.blocks.files.values()].sort((a, b) =>
      (b.identifier || '').localeCompare(a.identifier || ''),
    )
    let key = ''
    // Iterate over all collected blocks.
    files.forEach((file) => {
      if (!file.definition || !file.identifier || !file.definitionSource) {
        return
      }
      if (isBlock(file.definition)) {
        const variableName = 'block_' + toValidVariableName(file.identifier)
        definitions.push(`const ${variableName} = ${file.definitionSource}`)
        blocks.push(variableName)
        if (file.iconContents) {
          icons.set(file.definition.bundle, JSON.stringify(file.iconContents))
        }
        key += file.identifier
      } else {
        const variableName =
          'fragment_' + toValidVariableName(file.definition.name)
        definitions.push(`const ${variableName} = ${file.definitionSource}`)
        fragments.push(variableName)
        key += file.definition.name
      }
    })
    const renderKey = hash(key)
    return `
${definitions.join('\n\n')}

const blocks = [
  ${blocks.join(',\n  ')}
]

const fragments = [
  ${fragments.join(',\n  ')}
]

${toObject('icons', icons, true)}


const globalOptions = ${JSON.stringify(ctx.helper.options.globalOptions || {})}

const renderKey = "${renderKey}"

const definitions = {
  blocks,
  fragments,
  icons,
  globalOptions,
  renderKey
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
  renderKey: string
}

const definitions: Definitions

export default definitions
`
  },
  {
    dependencies: ['block-content', 'block-path'],
  },
)
