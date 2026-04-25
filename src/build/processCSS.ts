import { createRequire } from 'node:module'

let processor: any | null = null

function postcssMangleClasses(selectorParser: any) {
  const plugin = () => ({
    postcssPlugin: 'postcss-mangle-blokkli-classes',
    OnceExit(root: any) {
      root.walkRules((rule: any) => {
        if (
          rule.parent &&
          rule.parent.type === 'atrule' &&
          rule.parent.name === 'keyframes'
        ) {
          return
        }

        rule.selector = selectorParser((selectors: any) => {
          selectors.each((selector: any) => {
            let hasMangled = false
            let hasBk = false

            selector.walkClasses((classNode: any) => {
              if (classNode.value === 'bk') {
                hasBk = true
                return
              }
              if (classNode.value.startsWith('bk-')) return
              classNode.value = '_bk_' + classNode.value
              hasMangled = true
            })

            if (hasMangled && !hasBk) {
              const descendant = selector.clone()
              descendant.prepend(selectorParser.combinator({ value: ' ' }))
              descendant.prepend(selectorParser.className({ value: 'bk' }))

              const compound = selector.clone()
              compound.prepend(selectorParser.className({ value: 'bk' }))

              selector.replaceWith(descendant, compound)
            }
          })
        }).processSync(rule.selector)
      })
    },
  })

  plugin.postcss = true
  return plugin
}

/**
 * Process CSS through the same PostCSS+Tailwind pipeline used by blökkli
 * internally. Resolves @apply directives, scopes selectors to .bk, and
 * renames --tw-* variables to --bk-tw-*.
 *
 * When contentPaths are provided, Tailwind v4 will scan those directories for
 * utility classes via prepended @source directives.
 */
export async function processCSS(
  css: string,
  from?: string,
  contentPaths?: string[],
): Promise<string> {
  if (!processor) {
    processor = await createProcessor()
  }

  // Append @source directives after the input CSS so they don't conflict
  // with leading @import statements (CSS spec requires @import to precede
  // most other at-rules).
  const sourceDirectives = contentPaths?.length
    ? '\n' + contentPaths.map((dir) => `@source "${dir}/**/*.vue";`).join('\n')
    : ''

  const result = await processor.process(css + sourceDirectives, {
    from: from || 'module.css',
  })
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

    const postcssImport = _require('postcss-import')
    const postcssNesting = _require('postcss-nesting')
    const tailwindPostcss = _require('@tailwindcss/postcss')
    const selectorParser = _require('postcss-selector-parser')
    const postcssReplace = _require('postcss-replace')
    const remToPx = _require('@thedutchcoder/postcss-rem-to-px')

    const plugins = [
      (postcssImport.default || postcssImport)(),
      (postcssNesting.default || postcssNesting)(),
      (tailwindPostcss.default || tailwindPostcss)(),
      postcssMangleClasses(selectorParser)(),
      // Same scoping rules as postcss.config.cjs: scope selectors to .bk
      // and rename Tailwind CSS variables from --tw-* to --bk-tw-*.
      (postcssReplace.default || postcssReplace)({
        pattern: /(--tw|\*, ::before, ::after)/g,
        data: {
          '--tw': '--bk-tw',
          '*, ::before, ::after':
            '.bk, .bk *, .bk-sidebar, .bk ::before, .bk ::after, .bk-vars, .bk-vars ::before, .bk-vars ::after',
          '::backdrop': '.bk::backdrop, .bk ::backdrop',
        },
      }),
      (remToPx.default || remToPx)({ baseValue: 16 }),
    ]

    return postcss(plugins)
  } catch (e: any) {
    if (e.code === 'MODULE_NOT_FOUND') {
      const missing =
        e.message.match(/Cannot find module '([^']+)'/)?.[1] || 'unknown'
      throw new Error(
        `Missing dependency "${missing}" required for processing module CSS.\n` +
          `Install the required PostCSS packages:\n` +
          `npm install -D postcss tailwindcss @tailwindcss/postcss ` +
          `postcss-import postcss-nesting postcss-replace ` +
          `@thedutchcoder/postcss-rem-to-px`,
      )
    }
    throw e
  }
}
