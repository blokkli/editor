import type { ModuleContext } from '../../ModuleContext'
import { defineCodeTemplate } from '../defineTemplate'

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
`
  },
)
