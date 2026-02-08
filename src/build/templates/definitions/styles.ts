import { defineFileTemplate } from '../defineTemplate'

export default defineFileTemplate('styles.css', (ctx) => {
  const cssFilePath = ctx.helper.resolvers.module.resolve(
    './runtime/editor/css/output.css',
  )
  return `
@import url("${cssFilePath}");

${ctx.theme.css}
`
})
