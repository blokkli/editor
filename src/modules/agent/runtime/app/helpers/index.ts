import type {
  McpToolDefinition,
  McpToolContext,
  McpToolCategory,
  MutationAction,
  QueryResult,
  ToolError,
  ToolMeta,
} from '#blokkli/agent/app/types'
import type { UsageTurn } from '#blokkli/agent/shared/types'
import { coerceStringifiedParams } from '#blokkli/agent/shared/toolParams'
import type { BlokkliAdapter } from '#blokkli/editor/adapter'
import type { BlokkliApp } from '#blokkli/editor/types/app'
import type { EditMode } from '#blokkli/editor/types/state'

/**
 * Narrow an `unknown` to a plain record. One cast at the boundary so call
 * sites can read `obj.foo` without scattering casts everywhere.
 */
export function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : null
}

/**
 * Pull component side-channel meta (`_details`, `_usage`, `_skipLlmResponse`)
 * off an emitted tool result so the LLM-facing payload can be sent without
 * them.
 */
export function splitMeta(raw: unknown): {
  payload: unknown
  meta: ToolMeta
} {
  const obj = asRecord(raw)
  if (!obj) return { payload: raw, meta: {} }

  const meta: ToolMeta = {}
  if (obj._details !== undefined) meta.details = obj._details
  if (obj._usage) meta.usage = obj._usage as UsageTurn
  if (obj._skipLlmResponse === true) meta.skipLlmResponse = true

  if (Object.keys(meta).length === 0) {
    return { payload: raw, meta }
  }

  const { _details: _, _usage: __, _skipLlmResponse: ___, ...payload } = obj
  return { payload, meta }
}

/**
 * Create a map of tool name to tool definition for quick lookup.
 */
export function createToolMap(
  tools: McpToolDefinition[],
): Record<string, McpToolDefinition> {
  return Object.fromEntries(tools.map((t) => [t.name, t]))
}

/**
 * Get tool names for the server: everything this client can STRUCTURALLY run.
 *
 * Deliberately mode-agnostic — the server gates tools by the current edit mode
 * on every turn (and refuses out-of-mode calls at execution time), so the mode
 * can change mid-conversation without a re-init. Only genuine client
 * capabilities the server cannot know are filtered here:
 * 1. `tool.requiredAdapterMethods` (if any) must all exist on the adapter.
 * 2. `tool.isAvailable(app)` (if defined) must return (or resolve to) true.
 */
export async function getToolInfoForServer(
  tools: McpToolDefinition[],
  app: BlokkliApp,
  adapter?: BlokkliAdapter<unknown>,
): Promise<string[]> {
  const staticFiltered = tools.filter((tool) => {
    if (!tool.requiredAdapterMethods) return true
    if (!adapter) return true
    return tool.requiredAdapterMethods.every(
      (method) =>
        typeof (adapter as unknown as Record<string, unknown>)[method] ===
        'function',
    )
  })

  const availability = await Promise.all(
    staticFiltered.map((tool) =>
      tool.isAvailable ? Promise.resolve(tool.isAvailable(app)) : true,
    ),
  )

  return staticFiltered
    .filter((_, index) => availability[index])
    .map((t) => t.name)
}

/**
 * Reduce a list of tool names to those usable in the given edit mode. Used for
 * the first-message routing preprocess, which should only suggest tools the
 * server would actually offer for the mode the message is sent in.
 */
export function filterToolNamesByEditMode(
  tools: McpToolDefinition[],
  names: string[],
  editMode: EditMode,
): string[] {
  const byName = createToolMap(tools)
  return names.filter((name) => {
    const tool = byName[name]
    return !tool || tool.modes.includes(editMode)
  })
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

  // Coerce stringified arrays/objects before validation.
  const coerced = coerceStringifiedParams(params)

  // Validate params with Zod before executing
  const validatedParams = tool.paramsSchema.parse(coerced)

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
