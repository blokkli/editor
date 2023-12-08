import { createUnplugin } from 'unplugin'
import MagicString from 'magic-string'
import { walk } from 'estree-walker'
import type { Nuxt } from '@nuxt/schema'
import type { CallExpression, Expression, ObjectExpression } from 'estree'
import type { BlokkliItemDefinitionInput } from '../runtime/types'

/**
 * Type check for falsy values.
 *
 * Used as the callback for array.filter, e.g.
 * items.filter(falsy)
 */
export function falsy<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined
}

const fileRegex = /\.(vue)$/

type RuntimeDefinitionInput = {
  options?: {
    [key: string]: {
      default: string
    }
  }
  globalOptions?: string[]
}

/**
 * Build an object from an ObjectExpression.
 */
function estreeToObject(
  expression: ObjectExpression,
): BlokkliItemDefinitionInput<any> {
  return Object.fromEntries(
    expression.properties
      .map((prop) => {
        if (prop.type === 'Property') {
          if ('name' in prop.key) {
            if (prop.value.type === 'Literal') {
              return [prop.key.name, prop.value.value]
            } else if (prop.value.type === 'ObjectExpression') {
              return [prop.key.name, estreeToObject(prop.value)]
            }
          }
        }
        return null
      })
      .filter(falsy),
  )
}

/**
 * Build the runtime type definition from the full definition.
 *
 * During runtime, only the option default values and the array of globel
 * options are needed.
 */
function buildRuntimeDefinition(
  definition: BlokkliItemDefinitionInput<any>,
): RuntimeDefinitionInput {
  const runtimeDefinition: RuntimeDefinitionInput = {}

  if (definition.options) {
    runtimeDefinition.options = {}
    Object.entries(definition.options).forEach(
      ([optionKey, optionDefinition]) => {
        if (optionDefinition.default) {
          runtimeDefinition.options![optionKey] = {
            default: optionDefinition.default,
          }
        }
      },
    )
  }
  if (definition.globalOptions) {
    runtimeDefinition.globalOptions = definition.globalOptions
  }

  return runtimeDefinition
}

export const DefinitionPlugin = (nuxt: Nuxt, composableName: string) =>
  createUnplugin(() => {
    return {
      name: 'transform-file',
      enforce: 'post',
      transform(source, id) {
        if (!fileRegex.test(id)) {
          return
        }

        // Skip files that don't contain our string.
        if (!source.includes(composableName)) {
          return
        }

        const s = new MagicString(source)

        walk(
          this.parse(source, {
            sourceType: 'module',
            ecmaVersion: 'latest',
          }),
          {
            enter: async (node) => {
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
                  const definition = estreeToObject(arg)
                  const runtimeDefinition = buildRuntimeDefinition(definition)
                  const start = meta.start
                  const end = meta.end
                  s.overwrite(start, end, JSON.stringify(runtimeDefinition))
                }
              }
            },
          },
        )

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
