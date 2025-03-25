import { defineCodeTemplate } from '../defineTemplate'

export default defineCodeTemplate(
  'edit-adapter',
  (ctx) => {
    // Setup adapter.
    const resolvedPath =
      '~/app/blokkli.editAdapter'
        .replace(/^(~~|@@)/, ctx.helper.nuxt.options.rootDir)
        .replace(/^(~|@)/, ctx.helper.nuxt.options.srcDir) + '.ts'

    const fileExists = ctx.helper.fileCache.fileExists(resolvedPath)

    if (!fileExists) {
      throw new Error(
        'Missing blokkli adapter file in ~/app/blokkli.editAdapter.ts',
      )
    }

    return `
  import adapter from '${resolvedPath}'

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
