import { defineCodeTemplate } from '../defineTemplate'
import { isBlock, isFragment } from '../../Collector/Blocks'
import { toObject, toTypeLiteral } from '../helpers'
import { hash } from 'ohash'

type GlobalOptionInput = { type: string; options?: Record<string, unknown> }

/**
 * Transforms globalOptions to a minimal structure for type generation.
 * Only keeps `type` and `options` (needed by GetType helper).
 */
function transformGlobalOptionsForType(
  globalOptions: Record<string, GlobalOptionInput>,
): Record<
  string,
  {
    type: string
    options?: Record<string, unknown> | 'Record<string, unknown>'
  }
> {
  const result: Record<string, any> = {}

  for (const [key, option] of Object.entries(globalOptions)) {
    const entry: any = { type: option.type }

    // For radios/checkboxes, include options for proper keyof inference
    if (option.type === 'radios' || option.type === 'checkboxes') {
      if (option.options && Object.keys(option.options).length > 0) {
        // Keep only keys, values don't matter for type inference
        entry.options = Object.fromEntries(
          Object.keys(option.options).map((k) => [k, null]),
        )
      } else {
        // Mark for special handling - will be replaced with Record<string, unknown>
        entry.options = '__RECORD_STRING_UNKNOWN__'
      }
    }

    result[key] = entry
  }

  return result
}

/**
 * Generates GlobalOptionsType, replacing placeholder with Record<string, unknown>.
 */
function generateGlobalOptionsType(
  globalOptions: Record<string, GlobalOptionInput>,
): string {
  const transformed = transformGlobalOptionsForType(globalOptions)
  return toTypeLiteral(transformed).replaceAll(
    '"__RECORD_STRING_UNKNOWN__"',
    'Record<string, unknown>',
  )
}

export default defineCodeTemplate(
  'definitions',
  (ctx) => {
    const blocks: string[] = []
    const fragments: string[] = []
    const providers: string[] = []
    const icons = new Map<string, string>()
    const images = new Map<string, string>()

    const definitions: string[] = []

    const files = [...ctx.blocks.files.values()].sort((a, b) =>
      b.identifier.localeCompare(a.identifier),
    )
    let key = ''
    // Iterate over all collected blocks.
    files.forEach((file) => {
      if (!file.definition || !file.definitionSource) {
        return
      }
      const identifier = file.identifier
      key += identifier
      definitions.push(`const ${identifier} = ${file.definitionSource}`)
      if (isBlock(file.definition)) {
        blocks.push(identifier)
        if (file.iconContents) {
          icons.set(file.definition.bundle, JSON.stringify(file.iconContents))
        }
        if (file.imagePath) {
          images.set(file.definition.bundle, file.imagePath)
        }
      } else if (isFragment(file.definition)) {
        fragments.push(identifier)
      } else {
        providers.push(identifier)
      }
    })
    const renderKey = hash(key)

    const imageImports = [...images.entries()]
      .map(([bundle, imagePath]) => {
        return `import image_${bundle} from '${imagePath}?url'`
      })
      .join('\n')

    const imageObject = [...images.keys()]
      .map((bundle) => {
        return `${bundle}: image_${bundle}`
      })
      .join(',\n  ')

    return `
${imageImports}

${definitions.join('\n\n')}

const images = {
  ${imageObject}
}

const blocks = [
  ${blocks.join(',\n  ')}
]

const fragments = [
  ${fragments.join(',\n  ')}
]

const providers = [
  ${providers.join(',\n  ')}
]

${toObject('icons', icons, true)}


const globalOptions = ${JSON.stringify(ctx.helper.options.globalOptions || {})}

const renderKey = "${renderKey}"

const definitions = {
  blocks,
  fragments,
  providers,
  icons,
  images,
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
      if (isFragment(file.definition)) {
        fragmentNames.push(`'${file.definition.name}'`)
      }
    }

    return `
import type { GlobalOptionsKey } from '#blokkli-build/generated-types'
import type { BlockDefinitionInput, BlockDefinitionOptionsInput, FragmentDefinitionInput, ProviderDefinitionInput } from '${ctx.helper.relativePaths.TYPES_DEFINITIONS}'

export type BlockDefinition = BlockDefinitionInput<BlockDefinitionOptionsInput, GlobalOptionsKey[]>
export type FragmentDefinition = FragmentDefinitionInput<Record<string, any>, GlobalOptionsKey[]>
export type ProviderDefinition = ProviderDefinitionInput<Record<string, any>, GlobalOptionsKey[]>

export type BlokkliFragmentName = ${fragmentNames.join(' | ') || 'never'}

export type GlobalOptionsType = ${generateGlobalOptionsType(ctx.helper.options.globalOptions || {})}

export type Definitions = {
  blocks: BlockDefinition[]
  fragments: FragmentDefinition[]
  providers: ProviderDefinition[]
  icons: Record<string, string>
  images: Record<string, string>
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
