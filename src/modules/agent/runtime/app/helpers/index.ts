import type {
  McpToolDefinition,
  McpToolContext,
  McpToolCategory,
  MutationAction,
  QueryResult,
  ToolError,
} from '#blokkli/agent/app/types'
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
 * Get tool names for the server.
 * Filters by edit mode and adapter methods if provided.
 * All tools are static and resolved from bundled metadata on the server.
 */
export function getToolInfoForServer(
  tools: McpToolDefinition[],
  editMode: EditMode,
  adapter?: BlokkliAdapter<unknown>,
): string[] {
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
    .map((t) => t.name)
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
 * Resolve an array of tool definitions into a flat array.
 * All tools are now static — no factory resolution needed.
 */
export async function resolveTools(
  tools: McpToolDefinition[],
  _context: McpToolContext,
): Promise<McpToolDefinition[]> {
  return tools
}
