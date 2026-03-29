import type { Plugin } from 'vite'
import * as acorn from 'acorn'
import { processCSS } from '../src/build/processCSS'

function mangleClassName(name: string): string {
  if (name === 'bk' || name.startsWith('bk-')) return name
  return '_bk_' + name
}

function mangleClassString(str: string): string {
  return str.split(/\s+/).filter(Boolean).map(mangleClassName).join(' ')
}

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
 * Mangle Tailwind utility class names in Vue SFC source files.
 *
 * Transforms:
 * 1. Static class="..." attributes — split + rename tokens
 * 2. :class="..." bindings — parsed with acorn, only class-name strings renamed
 * 3. tw('...') calls — rename tokens in the string argument
 *
 * Only processes files under src/runtime/ (the blökkli editor source).
 * This plugin is playground-only — consumers get pre-mangled files from dist.
 */
export default function mangleClassesPlugin(): Plugin {
  return {
    name: 'blokkli-mangle-classes',
    enforce: 'pre',

    async transform(code, id) {
      if (
        !id.endsWith('.vue') ||
        (!id.includes('/src/runtime/') && !id.includes('/src/modules/'))
      ) {
        return null
      }

      let result = code

      // 1. Static class="..." attributes.
      // Negative lookbehind excludes :class and v-bind:class.
      result = result.replace(
        /(?<![:.])\bclass="([^"]*)"/g,
        (_match, value: string) => {
          return `class="${mangleClassString(value)}"`
        },
      )

      // 2. tw('...') and tw("...") marker calls in script sections.
      result = result.replace(
        /\btw\(\s*(['"])([\s\S]*?)\1\s*\)/g,
        (_match, quote: string, value: string) => {
          return `tw(${quote}${mangleClassString(value)}${quote})`
        },
      )

      // 3. :class bindings — use acorn to parse the expression properly.
      result = result.replace(
        /(?::|v-bind:)class="([^"]*)"/g,
        (_match, expr: string) => {
          return `:class="${mangleClassExpression(expr)}"`
        },
      )

      // 4. Process <style> blocks through blökkli's PostCSS pipeline.
      // Resolves @apply, nesting, theme(), mangles classes, scopes
      // --tw-* vars, and converts rem to px.
      const styleRegex = /<style([^>]*)>([\s\S]*?)<\/style>/g
      let styleMatch
      while ((styleMatch = styleRegex.exec(result)) !== null) {
        const fullMatch = styleMatch[0]
        const attrs = styleMatch[1] || ''
        const cssContent = styleMatch[2] || ''
        if (cssContent.trim()) {
          const processed = await processCSS(cssContent, id)
          // Strip lang="postcss" since content is now plain CSS.
          // This prevents Vite's CSS pipeline from re-running PostCSS
          // (which doesn't have blökkli's Tailwind config) during HMR.
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

      if (result === code) return null
      return { code: result, map: null }
    },
  }
}
