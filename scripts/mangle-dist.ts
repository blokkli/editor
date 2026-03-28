/**
 * Post-process dist/ to mangle Tailwind utility class names and
 * pre-process <style> blocks through blökkli's PostCSS pipeline.
 *
 * Run after `nuxt-module-build build` to transform the source .vue and .ts
 * files that ship in the npm package. The main CSS (output.css) is already
 * mangled by the PostCSS plugin during styles:build.
 *
 * Usage: npx tsx scripts/mangle-dist.ts
 */

import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import * as acorn from 'acorn'
import { processCSS } from '../src/build/processCSS'

// --- Rename logic ---

function mangleClassName(name: string): string {
  if (name === 'bk' || name.startsWith('bk-')) return name
  return '_bk_' + name
}

function mangleClassString(str: string): string {
  return str.split(/\s+/).filter(Boolean).map(mangleClassName).join(' ')
}

// --- :class expression parser ---

type Replacement = { start: number; end: number; value: string }

function collectClassReplacements(
  node: acorn.AnyNode,
  out: Replacement[],
): void {
  switch (node.type) {
    case 'Literal':
      if (typeof (node as any).value === 'string' && (node as any).value) {
        const mangled = mangleClassString((node as any).value)
        if (mangled !== (node as any).value) {
          out.push({
            start: node.start + 1,
            end: node.end - 1,
            value: mangled,
          })
        }
      }
      break

    case 'ObjectExpression':
      for (const prop of (node as any).properties) {
        if (prop.type === 'Property') {
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
      collectClassReplacements((node as any).consequent, out)
      collectClassReplacements((node as any).alternate, out)
      break

    case 'LogicalExpression':
      collectClassReplacements((node as any).left, out)
      collectClassReplacements((node as any).right, out)
      break

    case 'CallExpression':
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
  }
}

function mangleClassExpression(expr: string): string {
  let ast: ReturnType<typeof acorn.parse>
  try {
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

  replacements.sort((a, b) => b.start - a.start)
  let result = expr
  for (const r of replacements) {
    result = result.slice(0, r.start - 1) + r.value + result.slice(r.end - 1)
  }
  return result
}

// --- File transforms ---

function transformTemplateAndScript(code: string): string {
  let result = code

  // 1. Static class="..." attributes (not :class).
  result = result.replace(
    /(?<![:.])\bclass="([^"]*)"/g,
    (_match, value: string) => `class="${mangleClassString(value)}"`,
  )

  // 2. tw('...') and tw("...") marker calls.
  result = result.replace(
    /\btw\(\s*(['"])([\s\S]*?)\1\s*\)/g,
    (_match, quote: string, value: string) =>
      `tw(${quote}${mangleClassString(value)}${quote})`,
  )

  // 3. :class bindings — parse with acorn.
  result = result.replace(
    /(?::|v-bind:)class="([^"]*)"/g,
    (_match, expr: string) => `:class="${mangleClassExpression(expr)}"`,
  )

  return result
}

async function processStyleBlocks(
  code: string,
  filePath: string,
): Promise<string> {
  const styleRegex = /<style([^>]*)>([\s\S]*?)<\/style>/g
  let result = code
  let styleMatch

  while ((styleMatch = styleRegex.exec(result)) !== null) {
    const fullMatch = styleMatch[0]
    const attrs = styleMatch[1] || ''
    const cssContent = styleMatch[2] || ''
    if (cssContent.trim()) {
      const processed = await processCSS(cssContent, filePath)
      const replacement = `<style${attrs}>${processed}</style>`
      result =
        result.slice(0, styleMatch.index) +
        replacement +
        result.slice(styleMatch.index + fullMatch.length)
      styleRegex.lastIndex = styleMatch.index + replacement.length
    }
  }

  return result
}

// --- Walk directory ---

async function* walkFiles(
  dir: string,
  extensions: string[],
): AsyncGenerator<string> {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      yield* walkFiles(fullPath, extensions)
    } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
      yield fullPath
    }
  }
}

// --- Main ---

const distRuntime = join(process.cwd(), 'dist', 'runtime')

let filesProcessed = 0
let filesChanged = 0

for await (const filePath of walkFiles(distRuntime, ['.vue', '.ts'])) {
  const original = await readFile(filePath, 'utf-8')
  let transformed = transformTemplateAndScript(original)
  // Process <style> blocks in Vue files.
  if (filePath.endsWith('.vue')) {
    transformed = await processStyleBlocks(transformed, filePath)
  }
  filesProcessed++

  if (transformed !== original) {
    await writeFile(filePath, transformed, 'utf-8')
    filesChanged++
  }
}

console.log(
  `Mangled classes in ${filesChanged}/${filesProcessed} files in dist/runtime/`,
)
