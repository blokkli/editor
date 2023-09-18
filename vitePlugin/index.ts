import { createUnplugin } from 'unplugin'
import MagicString from 'magic-string'
import { walk } from 'estree-walker'
import type { CallExpression, Expression, ObjectExpression } from 'estree'

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

/**
 * Extract the paragraph definition.
 */
function estreeToObject(expression: ObjectExpression): Record<string, any> {
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

type ExtractedParagraph = {
  bundle: string
}

type ParagraphsBuilderPluginOptions = {
  patterns?: string[]
}

export const ParagraphsBuilderPlugin = createUnplugin(
  (options: ParagraphsBuilderPluginOptions) => {
    const collected: Record<string, ExtractedParagraph> = {}

    const virtualModuleId = 'virtual:my-module'
    const resolvedVirtualModuleId = '\0' + virtualModuleId
    let server: any = null

    return {
      name: 'transform-file',
      enforce: 'post',
      resolveId(id) {
        if (id === virtualModuleId) {
          return resolvedVirtualModuleId
        }
      },
      load(id) {
        if (id === resolvedVirtualModuleId) {
          return `export const paragraphs = ${JSON.stringify(collected)}`
        }
      },

      transform(source, id) {
        if (!fileRegex.test(id)) {
          return
        }

        if (!source.includes('defineParagraph')) {
          return
        }
        const s = new MagicString(source)

        walk(
          this.parse(source, {
            sourceType: 'module',
            ecmaVersion: 'latest',
          }),
          {
            enter: async (_node) => {
              if (
                _node.type !== 'CallExpression' ||
                (_node as CallExpression).callee.type !== 'Identifier'
              ) {
                return
              }
              const node = _node as CallExpression & {
                start: number
                end: number
              }
              const name = 'name' in node.callee && node.callee.name
              if (name === 'defineParagraph') {
                const arg = node.arguments[0]
                const meta = node.arguments[0] as Expression & {
                  start: number
                  end: number
                }
                if (arg.type === 'ObjectExpression') {
                  const definition = estreeToObject(arg)
                  console.log({ id, definition })
                  collected[id] = definition
                  server.restart()
                }
              }
            },
          },
        )

        return source
      },
      generateBundle() {},
      vite: {
        generateBundle() {
          // this.emitFile({
          //   type: 'chunk',
          //   fileName: 'paragraphs-builder.json',
          //   source: JSON.stringify(collected),
          // })
        },
        configureServer: (theServer) => {
          server = theServer
          // server.ws.on('paragraphs-builder:update', async () => {})
        },
        handleHotUpdate: {
          order: 'pre',
          handler: ({ modules }) => {
            // Remove macro file from modules list to prevent HMR overrides
            const index = modules.findIndex(
              (i) => i.id?.includes('?macro=true'),
            )
            if (index !== -1) {
              modules.splice(index, 1)
            }
          },
        },
      },
    }
  },
)
