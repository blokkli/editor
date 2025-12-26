import { defineCodeTemplate } from '../defineTemplate'
import { isBlock } from '../../Collector/Blocks'
import { falsy } from '../../helpers'
import { toObject } from '../helpers'
import type { BlockDefinitionInputBase } from './../../../shared/types/definitions'

export default defineCodeTemplate(
  'runtime-options',
  (ctx) => {
    const globalOptions = ctx.helper.options.globalOptions || {}

    const files = [...ctx.blocks.files.values()]

    const items = files
      .map((v) => {
        if (v.definition && v.identifier) {
          return {
            varName: v.identifier,
            definition: v.definition,
            variations: v.variations,
          }
        }
        return null
      })
      .filter(falsy)

    const declarations: string[] = []
    const OPTIONS = new Map<string, string>()
    const FIELD_MAPPING = new Map<string, string>()

    for (const item of items) {
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

      const hasOptions = Object.keys(options).length > 0

      if (hasOptions) {
        declarations.push(`const ${item.varName} = ${JSON.stringify(options)}`)
        OPTIONS.set(item.varName, item.varName)
      }

      item.variations.forEach((variation) => {
        if (hasOptions) {
          OPTIONS.set(variation, item.varName)
        }
      })

      if (isBlock(item.definition)) {
        if (item.definition.propsFieldMapping) {
          FIELD_MAPPING.set(
            item.definition.bundle,
            JSON.stringify(item.definition.propsFieldMapping, null, 2),
          )
        }
      }
    }

    return `
${declarations.join('\n')}

${toObject('OPTIONS', OPTIONS)}
${toObject('FIELD_MAPPING', FIELD_MAPPING)}
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

    function getOptionTypes(definition: BlockDefinitionInputBase) {
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
export declare const FIELD_MAPPING: Record<string, Record<string, string>>
`
  },
  {
    dependencies: ['block-content', 'block-path'],
  },
)
