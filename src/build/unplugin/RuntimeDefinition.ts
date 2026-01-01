import { createUnplugin } from 'unplugin'
import MagicString from 'magic-string'
import { walk, type Node } from 'estree-walker-ts'
import type { Nuxt } from '@nuxt/schema'
import type { CallExpression, Expression } from 'estree'
import { pathToFileURL } from 'node:url'
import { parseQuery, parseURL } from 'ufo'
import { parseTsObject } from '../helpers'
import {
  getIdentifier,
  isBlock,
  isFragment,
  type ExtractedDefinition,
} from '../Collector/Blocks'
import type { ModuleHelper } from '../ModuleHelper'

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

function generateRuntimeArg(definition: ExtractedDefinition) {
  if (isBlock(definition)) {
    return `${definition.bundle}::${getIdentifier(definition)}`
  } else if (isFragment(definition)) {
    return `${definition.name}::${getIdentifier(definition)}`
  }

  return `${definition.entityType}__${definition.bundle}::${getIdentifier(definition)}`
}

export const RuntimeDefinitionPlugin = (
  nuxt: Nuxt,
  helper: ModuleHelper,
  composableName: string,
  argIndex = 0,
) => {
  const cache = new Map<string, ExtractedDefinition>()

  function extract(source: string): ExtractedDefinition | null {
    const fromCache = cache.get(source)
    if (fromCache) {
      return fromCache
    }
    const definition = parseTsObject<ExtractedDefinition>(source)
    if (definition.object) {
      if (isBlock(definition.object)) {
        definition.object.bundle = helper.getMappedBlockBundle(
          definition.object.bundle,
        )
      }
      cache.set(source, definition.object)
      return definition.object
    }

    return null
  }

  return createUnplugin(() => {
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
              const arg = callNode.arguments[argIndex]
              if (!arg) {
                return
              }
              const meta = callNode.arguments[argIndex] as Expression & {
                start: number
                end: number
              }
              if (arg.type === 'ObjectExpression') {
                const start = meta.start
                const end = meta.end
                const objectSource = s.slice(start, end)
                const object = extract(objectSource)
                if (object) {
                  const arg = generateRuntimeArg(object)
                  s.overwrite(start, end, `"${arg}"`)
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
      },
    }
  })
}
