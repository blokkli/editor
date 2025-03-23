import { defineTemplate } from '../defineTemplate'
import { existsSync } from 'node:fs'
import { relative } from 'pathe'

const fileExists = (
  path?: string,
  extensions = ['js', 'ts'],
): string | null => {
  if (!path) {
    return null
  } else if (existsSync(path)) {
    // If path already contains/forces the extension
    return path
  }

  const extension = extensions.find((extension) =>
    existsSync(`${path}.${extension}`),
  )

  return extension ? `${path}.${extension}` : null
}

export default defineTemplate(
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
  import adapter from '${relative(ctx.helper.paths.blokkliBuildDir, resolvedPath)}'

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
