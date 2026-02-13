import { defineCodeTemplate } from '../../../../build/templates/defineTemplate'
import type { AgentCollector } from '../AgentCollector'
import type { AgentModelDefinition } from '../types'

/**
 * Creates the client template that imports all tool and prompt files and exports them as arrays.
 */
export default function (
  toolCollector: AgentCollector,
  promptCollector: AgentCollector,
  defaultPrompts: string[],
  models: AgentModelDefinition[],
  agentName: string,
) {
  return defineCodeTemplate(
    'agent-client',
    (ctx) => {
      const rel = (p: string) =>
        ctx.helper.toModuleBuildRelative(p).replace(/\.ts$/, '')
      const tools = toolCollector.getItems()
      const prompts = promptCollector.getItems()

      const imports: string[] = []
      const exports: string[] = []

      // Tool imports and export
      for (const tool of tools) {
        imports.push(`import ${tool.importName} from '${rel(tool.filePath)}'`)
      }
      if (tools.length === 0) {
        exports.push('export const mcpTools = []')
      } else {
        exports.push(
          `export const mcpTools = [\n  ${tools.map((t) => t.importName).join(',\n  ')}\n]`,
        )
      }

      // Prompt imports and export
      for (const prompt of prompts) {
        imports.push(
          `import ${prompt.importName} from '${rel(prompt.filePath)}'`,
        )
      }
      if (prompts.length === 0) {
        exports.push('export const agentPrompts = []')
      } else {
        exports.push(
          `export const agentPrompts = [\n  ${prompts.map((p) => p.importName).join(',\n  ')}\n]`,
        )
      }

      // Default prompts
      exports.push(
        `export const defaultPrompts = ${JSON.stringify(defaultPrompts)}`,
      )

      // Models
      exports.push(`export const models = ${JSON.stringify(models)}`)

      exports.push(`export const agentName = ${JSON.stringify(agentName)}`)

      const parts: string[] = []
      if (imports.length > 0) {
        parts.push(imports.join('\n'))
      }
      parts.push(exports.join('\n'))

      return parts.join('\n\n') + '\n'
    },
    () => {
      return `import type { McpToolItem, AgentPromptItem } from '#blokkli/agent/app/types'
import type { AgentModelDefinition } from '#blokkli/agent/shared/types'

export const mcpTools: McpToolItem[]
export const agentPrompts: AgentPromptItem[]
export const defaultPrompts: string[]
export const agentName: string
export const models: AgentModelDefinition[]
`
    },
  )
}
