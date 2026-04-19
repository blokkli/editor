import { defineCodeTemplate } from '../../../../build/templates/defineTemplate'
import type { AgentCollector } from '../AgentCollector'
import type { AgentModuleOptions, AgentModuleOptionsRoutes } from '../types'

/**
 * Creates the client template that imports all tool files and exports tool
 * definitions, routes, and related constants. Does NOT include prompts or
 * the agent name — those live in the lightweight `agent-prompts` template so
 * that dropdown registration in the outer agent feature doesn't pull the
 * tool/zod/websocket chain into the main editor chunk.
 */
export default function (
  toolCollector: AgentCollector,
  skillsCollector: AgentCollector,
  options: AgentModuleOptions,
  routes: AgentModuleOptionsRoutes,
) {
  return defineCodeTemplate(
    'agent-client',
    (ctx) => {
      const rel = (p: string) =>
        ctx.helper.toModuleBuildRelative(p).replace(/\.ts$/, '')
      const tools = toolCollector.getItems()

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

      // Default prompts
      exports.push(
        `export const defaultPrompts = ${JSON.stringify(options.defaultPrompts ?? [])}`,
      )

      // Models
      exports.push(`export const models = ${JSON.stringify(options.models)}`)

      exports.push(
        `export const hasWebFetch = ${JSON.stringify(!!options.allowedFetchOrigins)}`,
      )

      // Route constants
      exports.push(`export const routeAgent = ${JSON.stringify(routes.agent)}`)
      exports.push(`export const routeFetch = ${JSON.stringify(routes.fetch)}`)
      exports.push(
        `export const routeStream = ${JSON.stringify(routes.stream)}`,
      )
      exports.push(
        `export const routeRoute = ${JSON.stringify(routes.routing)}`,
      )

      // Tool and skill name arrays for auto-loading
      exports.push(
        `export const toolNames = ${JSON.stringify(toolCollector.getNames())}`,
      )
      exports.push(
        `export const skillNames = ${JSON.stringify(skillsCollector.getNames())}`,
      )

      const parts: string[] = []
      if (imports.length > 0) {
        parts.push(imports.join('\n'))
      }
      parts.push(exports.join('\n'))

      return parts.join('\n\n') + '\n'
    },
    (ctx) => {
      const tools = toolCollector.getItems()
      const skillNamesList = skillsCollector.getNames()

      const rel = (p: string) =>
        ctx.helper.toModuleBuildRelative(p).replace(/\.ts$/, '')

      const agentSkillNameType =
        skillNamesList.length > 0
          ? skillNamesList.map((n) => `'${n}'`).join(' | ')
          : 'string'

      // Generate per-tool type map using typeof import() to preserve
      // the exact paramsSchema/resultSchema generic arguments.
      const toolsWithNames = tools.filter((t) => t.name !== undefined)
      let toolMapBlock: string
      let agentToolNameType: string

      if (toolsWithNames.length > 0) {
        const entries = toolsWithNames
          .map((t) => {
            const importPath = rel(t.filePath)
            return `  '${t.name}': {
    params: _ToolParams<typeof import('${importPath}')['default']>
    result: _ToolResult<typeof import('${importPath}')['default']>
  }`
          })
          .join('\n')
        toolMapBlock = `export interface AgentToolMap {\n${entries}\n}`
        agentToolNameType = 'keyof AgentToolMap'
      } else {
        toolMapBlock = `export type AgentToolMap = Record<string, { params: Record<string, unknown>; result: unknown }>`
        agentToolNameType = 'string'
      }

      return `import type { z } from 'zod'
import type { McpToolDefinition } from '#blokkli/agent/app/types'
import type { AgentModelDefinition } from '#blokkli/agent/shared/types'

type _ToolParams<T> = T extends { paramsSchema: infer P extends z.ZodType } ? z.infer<P> : never
type _ToolResult<T> = T extends { resultSchema: infer R extends z.ZodType } ? z.infer<R> : never

${toolMapBlock}

export type AgentToolName = ${agentToolNameType}
export type AgentSkillName = ${agentSkillNameType}

export const routeAgent: string
export const routeFetch: string
export const routeStream: string
export const routeRoute: string
export const mcpTools: McpToolDefinition[]
export const defaultPrompts: string[]
export const models: AgentModelDefinition[]
export const hasWebFetch: boolean
export const toolNames: readonly AgentToolName[]
export const skillNames: readonly AgentSkillName[]
`
    },
  )
}
