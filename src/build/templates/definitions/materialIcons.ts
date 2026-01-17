import { defineFileTemplate } from '../defineTemplate'

export default defineFileTemplate('material-icons.d.ts', (ctx) => {
  const iconNames = ctx.icons.getValidMaterialIconNames()
  return `
/**
 * All available Material Symbols icon names (rounded style).
 */
export type MaterialIconName =
${iconNames.map((name) => `  | '${name}'`).join('\n')}
`
})
