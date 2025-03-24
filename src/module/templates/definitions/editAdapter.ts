import { fileExists } from './../../../helpers'
import { defineCodeTemplate } from '../defineTemplate'

export default defineCodeTemplate(
  'edit-adapter',
  (ctx) => {
    // Setup adapter.
    const resolvedPath = '~/app/blokkli.editAdapter'
      .replace(/^(~~|@@)/, ctx.helper.nuxt.options.rootDir)
      .replace(/^(~|@)/, ctx.helper.nuxt.options.srcDir)

    const maybeUserFile = fileExists(resolvedPath, ['ts'])

    if (!maybeUserFile) {
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
