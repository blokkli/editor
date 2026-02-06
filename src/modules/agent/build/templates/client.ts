import { defineCodeTemplate } from '../../../../build/templates/defineTemplate'
import type { McpToolCollector } from '../McpToolCollector'

/**
 * Creates the client template that imports all tool files and exports them as an array.
 */
export default function (collector: McpToolCollector) {
  return defineCodeTemplate(
    'agent-client',
    () => {
      const tools = collector.getTools()

      if (tools.length === 0) {
        return `export const mcpTools = []
`
      }

      const imports = tools.map(
        (tool) =>
          `import ${tool.importName} from '${tool.filePath.replace(/\.ts$/, '')}'`,
      )

      const toolsArrayEntries = tools.map((tool) => tool.importName)

      return `${imports.join('\n')}

export const mcpTools = [
  ${toolsArrayEntries.join(',\n  ')}
]
`
    },
    () => {
      return `import type { McpToolItem } from '#blokkli/agent/app/types'

export declare const mcpTools: McpToolItem[]
`
    },
  )
}
