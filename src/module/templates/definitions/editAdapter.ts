import { defineCodeTemplate } from '../defineTemplate'

export default defineCodeTemplate(
  'edit-adapter',
  (ctx) => {
    const pathRelative = ctx.helper.toModuleBuildRelative(
      ctx.helper.paths.editAdapter,
    )

    return `
  import adapter from '${pathRelative}'

export default adapter
`
  },
  (ctx) => {
    return `
import type { BlokkliAdapterFactory } from '${ctx.helper.relativePaths.ADAPTER}'

declare const adapter: BlokkliAdapterFactory<any>

export default adapter
`
  },
)
