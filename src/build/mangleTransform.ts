import * as acorn from 'acorn'
import { mangleClassName, mangleClassString } from './mangleClasses'
import { processCSS } from './processCSS'

type Replacement = { start: number; end: number; value: string }

/**
 * Walk a JS expression AST and collect replacements for string literals
 * that are in "class name" positions within a Vue :class binding.
 *
 * Class-name positions:
 * - Object keys: { 'class-name': condition }
 * - Array string elements: ['class-name', ...]
 * - Ternary branches: cond ? 'class-a' : 'class-b'
 * - Logical expression operands: active && 'class-name'
 * - Top-level string literals
 * - tw() call arguments
 *
 * NOT class-name positions:
 * - Object values (boolean conditions)
 * - Binary comparison operands (=== 'value')
 * - Function call arguments (except tw())
 */
function collectClassReplacements(
  node: acorn.AnyNode,
  out: Replacement[],
): void {
  switch (node.type) {
    case 'Literal':
      if (typeof (node as any).value === 'string' && (node as any).value) {
        const mangled = mangleClassString((node as any).value)
        if (mangled !== (node as any).value) {
          // +1 / -1 to skip the quote characters in source
          out.push({ start: node.start + 1, end: node.end - 1, value: mangled })
        }
      }
      break

    case 'ObjectExpression':
      for (const prop of (node as any).properties) {
        if (prop.type === 'Property') {
          // Only mangle the KEY — it's the class name.
          // Do NOT walk prop.value — it's the boolean condition.
          if (
            prop.key.type === 'Literal' &&
            typeof prop.key.value === 'string'
          ) {
            const mangled = mangleClassString(prop.key.value)
            if (mangled !== prop.key.value) {
              out.push({
                start: prop.key.start + 1,
                end: prop.key.end - 1,
                value: mangled,
              })
            }
          } else if (prop.computed) {
            collectClassReplacements(prop.key, out)
          }
        }
      }
      break

    case 'ArrayExpression':
      for (const el of (node as any).elements) {
        if (el) collectClassReplacements(el, out)
      }
      break

    case 'ConditionalExpression':
      // Don't walk test — it's a condition.
      collectClassReplacements((node as any).consequent, out)
      collectClassReplacements((node as any).alternate, out)
      break

    case 'LogicalExpression':
      collectClassReplacements((node as any).left, out)
      collectClassReplacements((node as any).right, out)
      break

    case 'CallExpression':
      // Only mangle tw() arguments.
      if (
        (node as any).callee.type === 'Identifier' &&
        (node as any).callee.name === 'tw'
      ) {
        for (const arg of (node as any).arguments) {
          if (arg.type === 'Literal' && typeof arg.value === 'string') {
            const mangled = mangleClassString(arg.value)
            if (mangled !== arg.value) {
              out.push({
                start: arg.start + 1,
                end: arg.end - 1,
                value: mangled,
              })
            }
          }
        }
      }
      break

    // Identifier, MemberExpression, BinaryExpression, UnaryExpression, etc.
    // — these are never class-name contexts, don't recurse.
  }
}

/**
 * Parse a :class expression with acorn and mangle only the class-name
 * string literals, leaving comparison values and other strings untouched.
 */
function mangleClassExpression(expr: string): string {
  let ast: ReturnType<typeof acorn.parse>
  try {
    // Wrap in parens so `{ ... }` parses as object, not block statement.
    ast = acorn.parse('(' + expr + ')', {
      ecmaVersion: 2022,
      sourceType: 'module',
    })
  } catch {
    return expr
  }

  const body = ast.body[0]
  if (!body || body.type !== 'ExpressionStatement') return expr

  const replacements: Replacement[] = []
  collectClassReplacements((body as any).expression, replacements)

  if (replacements.length === 0) return expr

  // Positions are shifted +1 because of the wrapping '('.
  // Map back to the original expr offsets.
  replacements.sort((a, b) => b.start - a.start)
  let result = expr
  for (const r of replacements) {
    result = result.slice(0, r.start - 1) + r.value + result.slice(r.end - 1)
  }
  return result
}

/**
 * Mangle template and script class names in a Vue SFC source string.
 *
 * Handles:
 * 1. Static class="..." attributes
 * 2. :class="..." bindings (parsed with acorn)
 * 3. tw('...') marker calls
 */
export function mangleTemplateAndScript(code: string): string {
  let result = code

  // 1. Static class="..." attributes.
  // Negative lookbehind excludes :class and v-bind:class.
  result = result.replace(
    /(?<![-:.])\bclass="([^"]*)"/g,
    (_match, value: string) => `class="${mangleClassString(value)}"`,
  )

  // 2. tw('...') and tw("...") marker calls in script sections.
  result = result.replace(
    /\btw\(\s*(['"])([\s\S]*?)\1\s*\)/g,
    (_match, quote: string, value: string) =>
      `tw(${quote}${mangleClassString(value)}${quote})`,
  )

  // 3. :class bindings — use acorn to parse the expression properly.
  result = result.replace(
    /(?::|v-bind:)class="([^"]*)"/g,
    (_match, expr: string) => `:class="${mangleClassExpression(expr)}"`,
  )

  return result
}

/**
 * Inject the directives needed for `@apply` / `theme()` to resolve against
 * the blökkli theme + utilities:
 * - `@reference 'tailwindcss'` registers the default Tailwind theme tokens
 *   and utility names (e.g. `font-medium`) without emitting their CSS.
 * - `@config '<path>'` layers the editor's theme overrides (custom colors,
 *   spacing, z-index, etc.) on top.
 *
 * Skips injection if the source already declares its own @reference or
 * @config directive.
 *
 * PERFORMANCE: every CSS chunk triggers Tailwind to load the config. With
 * ~86 SFCs in the editor (plus user-land module SFCs) and HMR re-running
 * on every save, this is a hot path during dev. If you ever notice slow
 * editor startup or sluggish HMR after the Tailwind 4 migration, look here.
 */
export function withTailwindConfig(
  cssContent: string,
  tailwindConfigPath: string,
): string {
  if (cssContent.includes('@reference') || cssContent.includes('@config')) {
    return cssContent
  }

  // CSS spec requires @import to precede most other at-rules (after @charset
  // and @layer name declarations). postcss-import silently skips @imports
  // that follow other at-rules, so we must inject AFTER any leading
  // @charset / @import / @layer-name-only directives.
  const leadingPattern =
    /^(?:\s*(?:\/\*[\s\S]*?\*\/|@charset[^;]*;|@import[^;]*;|@layer\s+[\w\s,-]+;))*\s*/
  const match = cssContent.match(leadingPattern)
  const insertAt = match ? match[0].length : 0
  const injection = `@reference 'tailwindcss';\n@config '${tailwindConfigPath}';\n`
  return cssContent.slice(0, insertAt) + injection + cssContent.slice(insertAt)
}

/**
 * Process <style> blocks in a Vue SFC through blökkli's PostCSS pipeline.
 * Resolves @apply, nesting, theme(), mangles classes, scopes --tw-* vars,
 * and converts rem to px. Strips lang="postcss" after processing.
 */
export async function processStyleBlocks(
  code: string,
  filePath: string,
  tailwindConfigPath: string,
): Promise<string> {
  const styleRegex = /<style([^>]*)>([\s\S]*?)<\/style>/g
  let result = code
  let styleMatch: RegExpExecArray | null

  while ((styleMatch = styleRegex.exec(result)) !== null) {
    const fullMatch = styleMatch[0]
    const attrs = styleMatch[1] || ''
    const cssContent = styleMatch[2] || ''
    if (cssContent.trim()) {
      const withConfig = withTailwindConfig(cssContent, tailwindConfigPath)
      const processed = await processCSS(withConfig, filePath)
      // Strip lang="postcss" since content is now plain CSS.
      const cleanAttrs = attrs.replace(/\s*lang=["']postcss["']/g, '')
      const replacement = `<style${cleanAttrs}>${processed}</style>`
      result =
        result.slice(0, styleMatch.index) +
        replacement +
        result.slice(styleMatch.index + fullMatch.length)
      // Reset regex since string length changed.
      styleRegex.lastIndex = styleMatch.index + replacement.length
    }
  }

  return result
}

/**
 * Fully transform a Vue SFC: mangle template/script class names and
 * process <style> blocks through the PostCSS pipeline.
 *
 * Returns null if no changes were made.
 */
export async function mangleVueSFC(
  code: string,
  id: string,
  tailwindConfigPath: string,
): Promise<string | null> {
  let result = mangleTemplateAndScript(code)
  result = await processStyleBlocks(result, id, tailwindConfigPath)
  if (result === code) return null
  return result
}

export { mangleClassName, mangleClassString }
