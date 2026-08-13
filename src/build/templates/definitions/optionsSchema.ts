import { defineFileTemplate, withHelper } from '../defineTemplate'
import { isBlock } from '../../Collector/Blocks'
import { defu } from 'defu'
import { sortObjectKeys } from '../../helpers'
import { resolveAlias } from '@nuxt/kit'

export default withHelper((helper) => {
  let fileName = 'options-schema.json'
  const outputPath = helper.options.schemaOptionsPath
  if (outputPath) {
    const resolved = resolveAlias(outputPath)
    fileName = helper.resolvers.src.resolve(resolved)
  }

  return defineFileTemplate(fileName, (ctx) => {
    const globalOptions = ctx.helper.options.globalOptions || {}
    const defaultLanguage = ctx.helper.options.defaultLanguage || 'en'

    // A label/description may be defined either as a plain string or as an
    // object keyed by language code. Normalize both to the object form so the
    // generated schema is always identical regardless of how it was authored.
    const normalizeDefinitionString = (value: any): any => {
      if (typeof value === 'string') {
        return { [defaultLanguage]: value }
      }
      return value
    }

    // Recursively normalize a single option definition: its own label and
    // description, plus the labels/descriptions of any nested `options`.
    const normalizeOption = (option: any): any => {
      if (!option || typeof option !== 'object') {
        return option
      }

      const result: Record<string, any> = { ...option }

      if ('label' in result) {
        result.label = normalizeDefinitionString(result.label)
      }
      if ('description' in result) {
        result.description = normalizeDefinitionString(result.description)
      }

      if (result.options && typeof result.options === 'object') {
        const normalizedOptions: Record<string, any> = {}
        for (const [key, value] of Object.entries(result.options)) {
          if (result.type === 'checkboxes') {
            // For checkboxes the value is the label itself (a DefinitionString).
            normalizedOptions[key] = normalizeDefinitionString(value)
          } else if (typeof value === 'string') {
            // Radios shorthand: a bare string is the option's label.
            normalizedOptions[key] = { label: { [defaultLanguage]: value } }
          } else {
            normalizedOptions[key] = normalizeOption(value)
          }
        }
        result.options = normalizedOptions
      }

      return result
    }

    const blocks = [...ctx.blocks.files.values()]
    const schema = blocks.reduce<Record<string, any>>((acc, v) => {
      if (v.definition && isBlock(v.definition)) {
        const bundle = v.definition.bundle
        const existing = acc[v.definition.bundle] || {}
        acc[v.definition.bundle] = defu(existing, v.definition.options || {})

        const globalOptionKeys: string[] = v.definition.globalOptions || []

        globalOptionKeys.forEach((name) => {
          if (globalOptions[name]) {
            acc[bundle][name] = globalOptions[name]
          }
        })
      }

      return acc
    }, {})

    for (const bundle of Object.keys(schema)) {
      const options = schema[bundle]
      for (const key of Object.keys(options)) {
        options[key] = normalizeOption(options[key])
      }
    }

    const sorted = sortObjectKeys(schema)
    return JSON.stringify(sorted, null, 2)
  })
})
