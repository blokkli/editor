import { defineCodeTemplate } from '../../../../build/templates/defineTemplate'
import type { McpToolCollector } from '../McpToolCollector'
import type { PromptCollector } from '../PromptCollector'

/**
 * Creates the client template that imports all tool and prompt files and exports them as arrays.
 */
export default function (
  toolCollector: McpToolCollector,
  promptCollector: PromptCollector,
) {
  return defineCodeTemplate(
    'agent-client',
    () => {
      const tools = toolCollector.getTools()
      const prompts = promptCollector.getPrompts()

      const parts: string[] = []

      // Tool imports and export
      if (tools.length === 0) {
        parts.push('export const mcpTools = []')
      } else {
        const toolImports = tools.map(
          (tool) =>
            `import ${tool.importName} from '${tool.filePath.replace(/\.ts$/, '')}'`,
        )
        parts.push(toolImports.join('\n'))
        parts.push(
          `\nexport const mcpTools = [\n  ${tools.map((t) => t.importName).join(',\n  ')}\n]`,
        )
      }

      // Prompt imports and export
      if (prompts.length === 0) {
        parts.push('export const agentPrompts = []')
      } else {
        const promptImports = prompts.map(
          (prompt) =>
            `import ${prompt.importName} from '${prompt.filePath.replace(/\.ts$/, '')}'`,
        )
        parts.push(promptImports.join('\n'))
        parts.push(
          `\nexport const agentPrompts = [\n  ${prompts.map((p) => p.importName).join(',\n  ')}\n]`,
        )
      }

      return parts.join('\n') + '\n'
    },
    () => {
      return `import type { McpToolItem, AgentPromptItem } from '#blokkli/agent/app/types'

export declare const mcpTools: McpToolItem[]
export declare const agentPrompts: AgentPromptItem[]
`
    },
  )
}
