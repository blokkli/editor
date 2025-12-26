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

    const sorted = sortObjectKeys(schema)
    return JSON.stringify(sorted, null, 2)
  })
})
