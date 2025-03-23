import { defineFileTemplate } from '../defineTemplate'
import { relative } from 'pathe'

export default defineFileTemplate('styles.css', (ctx) => {
  const cssFilePath = ctx.helper.resolvers.module.resolve(
    './runtime/css/output.css',
  )
  return `
@import url("${relative(ctx.helper.paths.blokkliBuildDir, cssFilePath)}");

${ctx.theme.css}
`
})
