import type { ModuleContext } from '../../ModuleContext'
import { defineCodeTemplate } from '../defineTemplate'

function buildColorPalette(ctx: ModuleContext): string[] {
  const palette: string[] = []
  for (const [id, option] of Object.entries(
    ctx.helper.options.colorOptions || {},
  )) {
    if ('shades' in option) {
      palette.push(`${id}.${option.mainShade}`)
    } else {
      palette.push(id)
    }
  }
  return palette
}

function mapVars(ctx: ModuleContext) {
  return {
    itemEntityType: JSON.stringify(
      ctx.helper.options.itemEntityType ?? 'block',
    ),
    fromLibraryBlockBundle: JSON.stringify(
      ctx.helper.options.fromLibraryBlockBundle ?? 'from_library',
    ),
    fragmentBlockBundle: JSON.stringify(
      ctx.helper.options.fragmentBlockBundle ?? 'blokkli_fragment',
    ),
    colorPalette: JSON.stringify(buildColorPalette(ctx)),
  }
}

export default defineCodeTemplate(
  'config',
  (ctx) => {
    const vars = mapVars(ctx)
    return `
export const itemEntityType = ${vars.itemEntityType}

export const fromLibraryBlockBundle = ${vars.fromLibraryBlockBundle}

export const fragmentBlockBundle = ${vars.fragmentBlockBundle}

export const colorPalette = ${vars.colorPalette}
`
  },
  (ctx) => {
    const vars = mapVars(ctx)
    return `
/**
 * The block item entity type.
 */
export declare const itemEntityType: ${vars.itemEntityType}

export declare const fromLibraryBlockBundle: ${vars.fromLibraryBlockBundle}
export declare const fragmentBlockBundle: ${vars.fragmentBlockBundle}

/**
 * Ordered list of canonical default color ids — one per declared family,
 * in declaration order. Flat colors appear as bare ids, ramped colors as
 * \`<id>.<mainShade>\`. Runtime consumers cycle through this to assign
 * default colors (e.g. dynamic chart series); the runtime composable also
 * walks it as a fallback cascade when a requested id can't be resolved.
 */
export declare const colorPalette: string[]
`
  },
)
