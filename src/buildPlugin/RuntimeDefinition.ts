import { createUnplugin } from 'unplugin'
import MagicString from 'magic-string'
import { walk, type Node } from 'estree-walker-ts'
import type { Nuxt } from '@nuxt/schema'
import type { CallExpression, Expression, ObjectExpression } from 'estree'
import { pathToFileURL } from 'node:url'
import { parseQuery, parseURL } from 'ufo'

export function isVue(
  id: string,
  opts: { type?: Array<'template' | 'script' | 'style'> } = {},
) {
  // Bare `.vue` file (in Vite)
  const { search } = parseURL(decodeURIComponent(pathToFileURL(id).href))
  if (id.endsWith('.vue') && !search) {
    return true
  }

  if (!search) {
    return false
  }

  const query = parseQuery(search)

  // Component async/lazy wrapper
  if (query.nuxt_component) {
    return false
  }

  // Macro
  if (
    query.macro &&
    (search === '?macro=true' || !opts.type || opts.type.includes('script'))
  ) {
    return true
  }

  // Non-Vue or Styles
  const type =
    'setup' in query
      ? 'script'
      : (query.type as 'script' | 'template' | 'style')
  if (!('vue' in query) || (opts.type && !opts.type.includes(type))) {
    return false
  }

  // Query `?vue&type=template` (in Webpack or external template)
  return true
}

function extractPropertyValue(obj: ObjectExpression, name: string) {
  for (let i = 0; i < obj.properties.length; i++) {
    const property = obj.properties[i]
    if (property.type !== 'Property') {
      continue
    }

    if (property.key.type !== 'Identifier') {
      continue
    }

    if (property.key.name !== name) {
      continue
    }

    if (property.value.type !== 'Literal') {
      continue
    }

    if (typeof property.value.value !== 'string') {
      continue
    }

    return property.value.value
  }
}

export const RuntimeDefinitionPlugin = (
  nuxt: Nuxt,
  composableName: string,
  property: string,
) =>
  createUnplugin(() => {
    return {
      name: 'blokkli:runtime-definition',
      enforce: 'post',
      transformInclude(id) {
        return isVue(id)
      },
      transform(source) {
        // Skip files that don't contain our string.
        if (!source.includes(composableName)) {
          return
        }

        const s = new MagicString(source)
        const parsed = this.parse(source, {
          sourceType: 'module',
          ecmaVersion: 'latest',
        }) as Node
        walk(parsed, {
          enter: (node) => {
            // We only care about calls to a method.
            if (
              node.type !== 'CallExpression' ||
              (node as CallExpression).callee.type !== 'Identifier'
            ) {
              return
            }

            const callNode = node as CallExpression & {
              start: number
              end: number
            }

            const name = 'name' in callNode.callee && callNode.callee.name
            if (name === composableName) {
              const arg = callNode.arguments[0]
              const meta = callNode.arguments[0] as Expression & {
                start: number
                end: number
              }
              if (arg.type === 'ObjectExpression') {
                const value = extractPropertyValue(arg, property)
                if (value) {
                  const start = meta.start
                  const end = meta.end
                  s.overwrite(start, end, `"${value}"`)
                }
              }
            }
          },
          leave: () => {},
        })

        if (s.hasChanged()) {
          return {
            code: s.toString(),
            map:
              nuxt.options.sourcemap.client || nuxt.options.sourcemap.server
                ? s.generateMap({ hires: true })
                : null,
          }
        }

        return source
      },
    }
  })
