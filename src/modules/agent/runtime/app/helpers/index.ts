import { z } from 'zod'
import type {
  McpToolDefinition,
  McpToolFactory,
  McpToolItem,
  McpToolContext,
  McpToolCategory,
  MutationAction,
  QueryResult,
  ToolError,
} from '#blokkli/agent/app/types'
import type { ClientToolDefinition } from '#blokkli/agent/shared/types'
import type { BlokkliAdapter } from '#blokkli/editor/adapter'
import type { EditMode } from '#blokkli/editor/types/state'

/**
 * Create a map of tool name to tool definition for quick lookup.
 */
export function createToolMap(
  tools: McpToolDefinition[],
): Record<string, McpToolDefinition> {
  return Object.fromEntries(tools.map((t) => [t.name, t]))
}

/**
 * Recursively strip $schema and additionalProperties from a JSON Schema object.
 * These are unnecessary for the LLM and waste context window tokens.
 */
function stripSchemaOverhead(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map(stripSchemaOverhead)
  }
  if (typeof obj === 'object' && obj !== null) {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      if (key === '$schema' || key === 'additionalProperties') continue
      result[key] = stripSchemaOverhead(value)
    }
    return result
  }
  return obj
}

/**
 * Get tools formatted for the server with JSON schemas.
 * Filters by edit mode and adapter methods if provided.
 */
export function getToolsForServer(
  tools: McpToolDefinition[],
  editMode: EditMode,
  adapter?: BlokkliAdapter<unknown>,
): ClientToolDefinition[] {
  return tools
    .filter((tool) => {
      // Filter by edit mode
      if (!tool.modes.includes(editMode)) return false

      // Filter by adapter methods
      if (!tool.requiredAdapterMethods) return true
      if (!adapter) return true
      return tool.requiredAdapterMethods.every(
        (method) =>
          typeof (adapter as unknown as Record<string, unknown>)[method] ===
          'function',
      )
    })
    .map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: stripSchemaOverhead(
        z.toJSONSchema(tool.paramsSchema),
      ) as object,
      ...(tool.lazy ? { lazy: true as const } : {}),
    }))
}

/**
 * Execute a tool by name with the given context and parameters.
 * Validates parameters with Zod before executing.
 */
export async function executeTool(
  toolMap: Record<string, McpToolDefinition>,
  name: string,
  context: McpToolContext,
  params: Record<string, unknown>,
): Promise<unknown> {
  const tool = toolMap[name]
  if (!tool) {
    throw new Error(`Unknown tool: ${name}`)
  }

  // Validate params with Zod before executing
  const validatedParams = tool.paramsSchema.parse(params)

  return tool.execute(context, validatedParams)
}

/**
 * Get the category of a tool by name.
 */
export function getToolCategory(
  toolMap: Record<string, McpToolDefinition>,
  name: string,
): McpToolCategory {
  const tool = toolMap[name]
  if (!tool) {
    throw new Error(`Unknown tool: ${name}`)
  }
  return tool.category
}

/**
 * Get the tool definition by name.
 */
export function getToolDefinition(
  toolMap: Record<string, McpToolDefinition>,
  name: string,
): McpToolDefinition {
  const tool = toolMap[name]
  if (!tool) {
    throw new Error(`Unknown tool: ${name}`)
  }
  return tool
}

/**
 * Check if a result is a MutationAction.
 */
export function isMutationAction(result: unknown): result is MutationAction {
  return (
    typeof result === 'object' &&
    result !== null &&
    'type' in result &&
    'label' in result &&
    'apply' in result &&
    typeof (result as MutationAction).apply === 'function'
  )
}

/**
 * Check if a result is a QueryResult.
 */
export function isQueryResult(result: unknown): result is QueryResult {
  return (
    typeof result === 'object' &&
    result !== null &&
    'label' in result &&
    'result' in result &&
    !('apply' in result) // Distinguish from MutationAction which also has 'label'
  )
}

/**
 * Check if a result is a ToolError.
 */
export function isToolError(result: unknown): result is ToolError {
  return (
    typeof result === 'object' &&
    result !== null &&
    'error' in result &&
    typeof (result as ToolError).error === 'string'
  )
}

/**
 * Check if a tool item is a factory (produces tools dynamically at runtime).
 */
export function isToolFactory(item: McpToolItem): item is McpToolFactory {
  return '__factory' in item && (item as McpToolFactory).__factory === true
}

/**
 * Check if a tool item is a static tool definition (not a factory).
 */
export function isToolDefinition(item: McpToolItem): item is McpToolDefinition {
  return !isToolFactory(item)
}

/**
 * Resolve an array of tool items (static definitions + factories) into
 * a flat array of McpToolDefinition objects.
 *
 * Each factory's resolve callback is called to produce tools. The individual
 * tools returned by factories have their own requiredAdapterMethods, which
 * are checked later by getToolsForServer.
 */
export async function resolveTools(
  tools: McpToolItem[],
  context: McpToolContext,
): Promise<McpToolDefinition[]> {
  const resolved: McpToolDefinition[] = []
  for (const tool of tools) {
    if (isToolFactory(tool)) {
      const factoryTools = await tool.resolve(context)
      resolved.push(...(factoryTools as McpToolDefinition[]))
    } else {
      resolved.push(tool)
    }
  }
  return resolved
}
