import { createRequire } from 'node:module'
import { useLogger } from '@nuxt/kit'

const logger = useLogger('@blokkli/editor')

let processor: any | null = null
let processorUnavailable = false

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

            // Idempotent: already-mangled selectors (`._bk_*`) are skipped so
            // a re-process pass cannot turn them into `._bk__bk_*`.
            selector.walkClasses((classNode: any) => {
              if (classNode.value === 'bk') {
                hasBk = true
                return
              }
              if (classNode.value.startsWith('bk-')) return
              if (classNode.value.startsWith('_bk_')) {
                hasMangled = true
                return
              }
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
 * Lazily build and cache the PostCSS processor. Returns null (and warns
 * once) if the required deps aren't installed — see createProcessor for the
 * rationale.
 */
export async function ensureProcessor(): Promise<any | null> {
  if (processor || processorUnavailable) return processor
  processor = await createProcessor()
  return processor
}

/**
 * Process CSS through the same PostCSS+Tailwind pipeline used by blökkli
 * internally. Resolves @apply directives, scopes selectors to .bk, and
 * renames --tw-* variables to --bk-tw-*.
 *
 * When contentPaths are provided, Tailwind v4 will scan those directories for
 * utility classes via prepended @source directives.
 *
 * Returns the input unchanged when the PostCSS pipeline is unavailable
 * (consumer project on Tailwind v3, missing peer deps, etc.).
 */
export async function processCSS(
  css: string,
  from?: string,
  contentPaths?: string[],
): Promise<string> {
  const proc = await ensureProcessor()
  if (!proc) return css

  // Append @source directives after the input CSS so they don't conflict
  // with leading @import statements (CSS spec requires @import to precede
  // most other at-rules).
  const sourceDirectives = contentPaths?.length
    ? '\n' + contentPaths.map((dir) => `@source "${dir}/**/*.vue";`).join('\n')
    : ''

  const result = await proc.process(css + sourceDirectives, {
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
      // The PostCSS pipeline is only needed for user-land blökkli modules /
      // features that use `@apply` or `theme()` from blökkli's Tailwind v4
      // setup. A consumer with no such modules — or one still on Tailwind v3
      // — shouldn't be required to install these packages. Warn once and
      // disable the pipeline; processCSS() will return its input unchanged.
      processorUnavailable = true
      const missing =
        e.message.match(/Cannot find module '([^']+)'/)?.[1] || 'unknown'
      logger.warn(
        `blökkli's PostCSS pipeline is disabled — missing dependency ` +
          `"${missing}". This is only required if you author custom blökkli ` +
          `modules or features that use Tailwind v4 \`@apply\` / \`theme()\` ` +
          `in their <style> blocks. To enable it, install:\n` +
          `  npm install -D postcss tailwindcss @tailwindcss/postcss ` +
          `postcss-import postcss-nesting postcss-replace ` +
          `@thedutchcoder/postcss-rem-to-px`,
      )
      return null
    }
    throw e
  }
}
