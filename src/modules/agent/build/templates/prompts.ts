import { defineCodeTemplate } from '../../../../build/templates/defineTemplate'
import type { AgentCollector } from '../AgentCollector'
import type { AgentModuleOptions } from '../types'

/**
 * Lightweight companion to the `agent-client` template. Exports just the
 * prompts (for item-dropdown registration) and the agent name (for labels).
 * Kept separate so the outer agent feature component can register dropdown
 * actions without pulling in the heavy tool/zod/websocket machinery.
 */
export default function (
  promptCollector: AgentCollector,
  options: AgentModuleOptions,
) {
  return defineCodeTemplate(
    'agent-prompts',
    (ctx) => {
      const rel = (p: string) =>
        ctx.helper.toModuleBuildRelative(p).replace(/\.ts$/, '')
      const prompts = promptCollector.getItems()

      const imports: string[] = []
      const exports: string[] = []

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

      exports.push(
        `export const agentName = ${JSON.stringify(options.agentName ?? 'Superblökkli')}`,
      )

      const parts: string[] = []
      if (imports.length > 0) {
        parts.push(imports.join('\n'))
      }
      parts.push(exports.join('\n'))

      return parts.join('\n\n') + '\n'
    },
    () => {
      return `import type { AgentPromptItem } from '#blokkli/agent/app/types'

export const agentPrompts: AgentPromptItem[]
export const agentName: string
`
    },
  )
}
