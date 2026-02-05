import type {
  McpToolDefinition,
  McpToolCategory,
  McpToolFactoryInput,
  McpToolFactory,
} from '#blokkli/agent/app/types'
import type { AdapterMethods } from '#blokkli/editor/adapter'
import type { z } from 'zod'
import type { Component } from 'vue'

/**
 * Define an MCP tool for the blokkli AI agent using Zod schemas.
 *
 * Tools are defined once and compiled into two bundles:
 * - Client bundle: Full definition with execute function (for Vue component)
 * - Server bundle: Tools are sent dynamically via WebSocket on init
 *
 * The Zod schemas provide:
 * - Type-safe parameter and result definitions with TypeScript inference
 * - Runtime validation on the client
 * - Automatic JSON Schema generation for the AI server
 *
 * @example
 * ```typescript
 * import { z } from 'zod'
 *
 * const paramsSchema = z.object({
 *   uuid: z.string().describe('The block UUID'),
 * })
 *
 * const resultSchema = z.object({
 *   uuid: z.string(),
 *   bundle: z.string(),
 * })
 *
 * export default defineBlokkliAgentTool({
 *   name: 'get_block_info',
 *   description: 'Get detailed information about a specific block by its UUID',
 *   category: 'query',
 *   paramsSchema,
 *   resultSchema,
 *   execute: (ctx, params) => {
 *     const block = ctx.app.blocks.getBlock(params.uuid)
 *     if (!block) throw new Error(`Block not found: ${params.uuid}`)
 *     return {
 *       label: 'Get block info',
 *       result: { uuid: params.uuid, bundle: block.bundle }
 *     }
 *   },
 * })
 * ```
 *
 * @example Factory pattern for dynamic tools:
 * ```typescript
 * export default defineBlokkliAgentTool({
 *   resolve: async (ctx) => {
 *     if (!ctx.adapter.getContentSearchTabs) return []
 *     const tabs = await ctx.adapter.getContentSearchTabs()
 *     return Object.entries(tabs).map(([id, label]) =>
 *       defineBlokkliAgentTool({
 *         name: `search_${id}`,
 *         requiredAdapterMethods: ['getContentSearchResults'],
 *         // ... each tool has full type safety
 *       })
 *     )
 *   },
 * })
 * ```
 */

// Overload: static tool definition
export function defineBlokkliAgentTool<
  TParamsSchema extends z.ZodType,
  TResultSchema extends z.ZodType,
  const TMethods extends readonly AdapterMethods[] = readonly [],
  TComponent extends Component | undefined = undefined,
  TCategory extends McpToolCategory = McpToolCategory,
>(
  options: McpToolDefinition<
    TParamsSchema,
    TResultSchema,
    TMethods,
    TComponent,
    TCategory
  >,
): McpToolDefinition<
  TParamsSchema,
  TResultSchema,
  TMethods,
  TComponent,
  TCategory
>

// Overload: factory pattern
export function defineBlokkliAgentTool(
  options: McpToolFactoryInput,
): McpToolFactory

// Implementation
export function defineBlokkliAgentTool(
  options: McpToolDefinition<any, any, any, any, any> | McpToolFactoryInput,
): McpToolDefinition<any, any, any, any, any> | McpToolFactory {
  if ('resolve' in options) {
    return { ...options, __factory: true as const } as McpToolFactory
  }
  return options
}
