import { defineCodeTemplate } from '../defineTemplate'

export default defineCodeTemplate(
  'config',
  (ctx) => {
    return `
export const itemEntityType = ${JSON.stringify(
      ctx.helper.options.itemEntityType || 'block',
    )}
`
  },
  () => {
    return `
/**
 * The block item entity type.
 */
export declare const itemEntityType: string
`
  },
)
