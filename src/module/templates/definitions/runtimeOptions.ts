import { defineCodeTemplate } from '../defineTemplate'
import { isBlock } from '../../../Collector/Blocks'
import { falsy } from '../../../helpers'
import type { ExtractedBlockDefinitionInput } from '../../types'

export default defineCodeTemplate(
  'runtime-options',
  (ctx) => {
    const globalOptions = ctx.helper.options.globalOptions || {}

    const files = [...ctx.blocks.files.values()]

    const items = files
      .map((v) => {
        if (v.definition) {
          if (isBlock(v.definition)) {
            return {
              key: 'block:' + v.definition.bundle,
              definition: v.definition,
              renderFor: v.definition.renderFor,
            }
          }
          return {
            key: 'fragment:' + v.definition.name,
            definition: v.definition,
            renderFor: undefined,
          }
        }
        return null
      })
      .filter(falsy)
      .sort((a, b) => b.key.localeCompare(a.key))
      .reduce<Record<string, any>>((acc, item) => {
        if (item.renderFor) {
          return acc
        }
        const key = item.key
        const optionDefinitions = Object.entries(item.definition.options || {})

        const options: Record<string, any> = {}

        if (item.definition.globalOptions) {
          item.definition.globalOptions.forEach((name) => {
            const option = globalOptions[name]
            if (option) {
              options[name] = [option.type, option.default]
            }
          })
        }

        optionDefinitions.forEach(([name, option]) => {
          options[name] = [option.type, option.default]
        })

        if (Object.values(options).length) {
          acc[key] = options
        }

        return acc
      }, {})

    return `
export const OPTIONS = ${JSON.stringify(items, null, 2)}
`
  },
  (ctx) => {
    const globalOptions = ctx.helper.options.globalOptions || {}

    const blocks = [...ctx.blocks.files.values()]
      .map((v) => {
        if (v.definition && isBlock(v.definition)) {
          return v.definition
        }
        return null
      })
      .filter(falsy)

    function getOptionTypes(definition: ExtractedBlockDefinitionInput) {
      const definedOptions = definition.options || {}

      // Add global options used.
      const blockGlobalOptions: string[] = definition.globalOptions || []
      blockGlobalOptions.forEach((key) => {
        if (globalOptions[key]) {
          definedOptions[key] = globalOptions[key]
        }
      })

      return Object.entries(definedOptions || {}).map(([key, option]) => {
        if (option.type === 'text' || option.type === 'datetime-local') {
          return `${key}: string`
        } else if (option.type === 'checkbox') {
          return `${key}: boolean`
        } else if (option.type === 'checkboxes') {
          const possibleValues =
            Object.keys(option.options)
              .map((v) => `'${v}'`)
              .join(' | ') || 'string'
          return `${key}: Array<${possibleValues}>`
        } else if (option.type === 'radios') {
          const possibleValues =
            Object.keys(option.options)
              .map((v) => `'${v}'`)
              .join(' | ') || 'string'
          return `${key}: ${possibleValues}`
        } else if (option.type === 'color') {
          return key + ': ' + '`#${string}`'
        } else if (option.type === 'range' || option.type === 'number') {
          return `${key}: number`
        }
      })
    }

    const runtimeMappedOptionTypes = blocks
      .map((definition) => {
        if (definition.renderFor) {
          return null
        }
        const bundle = definition.bundle
        const options = getOptionTypes(definition).join('\n    ')
        if (!options) {
          return `  ${bundle}: {}`
        }
        return `  ${bundle}: {
    ${options}
  }`
      })
      .filter(falsy)
      .join(',\n')

    return `
import type { BlockOptionDefinition } from '${ctx.helper.relativePaths.TYPES_BLOKK_OPTIONS}'

export type RuntimeBlockOptionArray = {
  [T in BlockOptionDefinition as T['type']]: [T['type'], T['default']]
}[BlockOptionDefinition['type']]

export type RuntimeBlockOptions = {
${runtimeMappedOptionTypes}
}

export declare const OPTIONS: Record<string, Record<string, RuntimeBlockOptionArray>>
`
  },
  {
    dependencies: ['block-content', 'block-path'],
  },
)
