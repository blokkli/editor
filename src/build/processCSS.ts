import { createRequire } from 'node:module'

let processor: any = null

/**
 * Process CSS through the same PostCSS+Tailwind pipeline used by blökkli
 * internally. Resolves @apply directives, scopes selectors to .bk, and
 * renames --tw-* variables to --bk-tw-*.
 */
export async function processCSS(css: string, from?: string): Promise<string> {
  if (!processor) {
    processor = await createProcessor()
  }

  const result = await processor.process(css, { from: from || 'module.css' })
  return result.css
}

/**
 * Reset the cached PostCSS processor. Call this when module CSS files change
 * so that postcss-import re-reads imported partials from disk.
 */
export function resetProcessor(): void {
  processor = null
}

async function createProcessor(): Promise<any> {
  const _require = createRequire(import.meta.url)

  try {
    const postcss = _require('postcss')
    const { default: tailwindConfig } = await import('./tailwindConfig')

    const plugins = [
      _require('postcss-import'),
      _require('tailwindcss/nesting'),
      _require('tailwindcss')({
        ...tailwindConfig,
        // Empty content prevents Tailwind from scanning the project.
        // @apply directives are resolved regardless of content scanning.
        content: [{ raw: ' ', extension: 'html' }],
      }),
      // Same scoping rules as postcss.config.cjs: scope selectors to .bk
      // and rename Tailwind CSS variables from --tw-* to --bk-tw-*.
      _require('postcss-replace')({
        pattern: /(--tw|\*, ::before, ::after)/g,
        data: {
          '--tw': '--bk-tw',
          '*, ::before, ::after':
            '.bk, .bk *, .bk-sidebar, .bk ::before, .bk ::after, .bk-vars, .bk-vars ::before, .bk-vars ::after',
          '::backdrop': '.bk::backdrop, .bk ::backdrop',
        },
      }),
      _require('@thedutchcoder/postcss-rem-to-px')({ baseValue: 16 }),
    ]

    return postcss(plugins)
  } catch (e: any) {
    if (e.code === 'MODULE_NOT_FOUND') {
      const missing =
        e.message.match(/Cannot find module '([^']+)'/)?.[1] || 'unknown'
      throw new Error(
        `Missing dependency "${missing}" required for processing module CSS.\n` +
          `Install the required PostCSS packages:\n` +
          `npm install -D postcss tailwindcss postcss-import postcss-replace ` +
          `@thedutchcoder/postcss-rem-to-px`,
      )
    }
    throw e
  }
}
