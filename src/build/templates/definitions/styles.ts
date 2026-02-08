import { defineFileTemplate } from '../defineTemplate'

export default defineFileTemplate('styles.css', (ctx) => {
  const cssFilePath = ctx.helper.resolvers.module.resolve(
    './runtime/editor/css/output.css',
  )
  const relativePath = ctx.helper.toModuleBuildRelative(cssFilePath)
  return `
@import url("${relativePath}");

${ctx.theme.css}
`
})
