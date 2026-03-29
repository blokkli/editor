import { createRequire } from 'node:module'

const processors = new Map<string, any>()

/**
 * Process CSS through the same PostCSS+Tailwind pipeline used by blökkli
 * internally. Resolves @apply directives, scopes selectors to .bk, and
 * renames --tw-* variables to --bk-tw-*.
 *
 * When contentPaths are provided, Tailwind will scan those files and generate
 * utility classes for any classes found in them.
 */
export async function processCSS(
  css: string,
  from?: string,
  contentPaths?: string[],
): Promise<string> {
  const key = contentPaths?.join(',') || ''
  if (!processors.has(key)) {
    processors.set(key, await createProcessor(contentPaths))
  }

  const processor = processors.get(key)!
  const result = await processor.process(css, { from: from || 'module.css' })
  return result.css
}

/**
 * Reset all cached PostCSS processors. Call this when module CSS files change
 * so that postcss-import re-reads imported partials from disk.
 */
export function resetProcessor(): void {
  processors.clear()
}

async function createProcessor(contentPaths?: string[]): Promise<any> {
  const _require = createRequire(import.meta.url)

  try {
    const postcss = _require('postcss')
    const { default: tailwindConfig } = await import('./tailwindConfig')

    // When content paths are provided, scan those files for utility classes.
    // Otherwise, use empty content — @apply directives still resolve.
    const content = contentPaths?.length
      ? contentPaths.map((dir) => dir + '/**/*.vue')
      : [{ raw: ' ', extension: 'html' }]

    const plugins = [
      _require('postcss-import'),
      _require('tailwindcss/nesting'),
      _require('tailwindcss')({
        ...tailwindConfig,
        content,
      }),
      _require('./postcssMangleClasses.cjs'),
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
