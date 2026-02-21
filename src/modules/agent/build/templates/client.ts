import { defineCodeTemplate } from '../../../../build/templates/defineTemplate'
import type { AgentCollector } from '../AgentCollector'
import type { AgentModuleOptions } from '../types'

/**
 * Creates the client template that imports all tool and prompt files and exports them as arrays.
 */
export default function (
  toolCollector: AgentCollector,
  promptCollector: AgentCollector,
  options: AgentModuleOptions,
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
        `export const defaultPrompts = ${JSON.stringify(options.defaultPrompts ?? [])}`,
      )

      // Models
      exports.push(`export const models = ${JSON.stringify(options.models)}`)

      exports.push(
        `export const agentName = ${JSON.stringify(options.agentName ?? 'Superblökkli')}`,
      )

      exports.push(
        `export const hasWebFetch = ${JSON.stringify(!!options.allowedFetchOrigins)}`,
      )

      const parts: string[] = []
      if (imports.length > 0) {
        parts.push(imports.join('\n'))
      }
      parts.push(exports.join('\n'))

      return parts.join('\n\n') + '\n'
    },
    () => {
      return `import type { McpToolDefinition, AgentPromptItem } from '#blokkli/agent/app/types'
import type { AgentModelDefinition } from '#blokkli/agent/shared/types'

export const mcpTools: McpToolDefinition[]
export const agentPrompts: AgentPromptItem[]
export const defaultPrompts: string[]
export const agentName: string
export const models: AgentModelDefinition[]
export const hasWebFetch: boolean
`
    },
  )
}
