import { z } from 'zod'
import type {
  ClientToolDefinition,
  ClientPlanState,
  GenericContentBlock,
  GenericTextBlock,
  GenericSkillBlock,
  ServerMessage,
} from '../../shared/types'
import type { ResolvedSkill } from '../skills/types'

// ============================================================================
// Plan Types (server-side, includes descriptions)
// ============================================================================

export type ServerPlanStep = {
  label: string
  description: string
  status: 'pending' | 'in_progress' | 'completed'
}

export type ServerPlan = {
  title: string
  steps: ServerPlanStep[]
}

// ============================================================================
// Tool Result Entry
// ============================================================================

export type ToolResultEntry = {
  type: 'tool_result'
  tool_use_id: string
  content: string
  is_error?: boolean
}

// ============================================================================
// Context Types
// ============================================================================

/**
 * Context available when building tool definitions and schemas.
 * Lets each tool decide visibility and shape its input schema dynamically.
 */
export type ToolDefinitionContext = {
  resolvedSkills: ResolvedSkill[]
  plan: ServerPlan | null
  unloadedLazyTools: { name: string; description: string }[]
}

/**
 * Context passed to `handle()` — provides access to session state
 * and communication helpers each handler needs.
 */
export type ServerToolContext = {
  toolUseId: string
  send: (message: ServerMessage) => void
  resolvedSkills: ResolvedSkill[]
  lazyToolNames: string[]
  activatedLazyTools: Set<string>
  loadedSkills: Set<string>
  plan: ServerPlan | null
  setPlan: (plan: ServerPlan | null) => void
  toClientPlan: () => ClientPlanState | null
  waitForPlanApproval: () => Promise<boolean>
  assistantContent: GenericContentBlock[]
  commitMessagesEarly: (toolResult: ToolResultEntry) => void
  updateLastToolResult: (toolUseId: string, content: string) => void
  /** Whether any non-server tools were called since the current plan step started. */
  planStepHasWork: boolean
  /** Mark that real work was performed for the current plan step. */
  markPlanStepWork: () => void
  /** Reset the work flag (called after advancing to the next plan step). */
  resetPlanStepWork: () => void
}

// ============================================================================
// Server Tool Result
// ============================================================================

/**
 * Return type of a server-side tool handler.
 */
export type ServerToolResult = {
  toolResults: ToolResultEntry[]
  extraBlocks?: (GenericTextBlock | GenericSkillBlock)[]
  /** When true, messages were already committed (e.g. create_plan). */
  messagesCommitted?: boolean
}

// ============================================================================
// Server-Side Tool Definition
// ============================================================================

/**
 * A server-side tool.
 *
 * `inputSchema` is a callback that receives the current turn's context and
 * returns a zod schema. The schema serves double duty:
 *  - converted to JSON Schema via `z.toJSONSchema()` for the LLM, and
 *  - used for runtime validation of the LLM's response via `.parse()`.
 *
 * Static tools can ignore the context parameter; dynamic tools (e.g. those
 * with runtime enum values) use it to build the right constraints.
 *
 * `isAvailable` controls whether the tool is offered on a given turn.
 * When omitted the tool is always included.
 */
export type ServerSideTool<T extends z.ZodType = z.ZodType> = {
  name: string
  description: string
  inputSchema: (ctx: ToolDefinitionContext) => T
  /** Return false to hide this tool for the current turn. */
  isAvailable?: (ctx: ToolDefinitionContext) => boolean
  handle: (
    ctx: ServerToolContext,
    input: z.infer<T>,
  ) => Promise<ServerToolResult> | ServerToolResult
}

/**
 * Identity function for type inference when defining a server-side tool.
 */
export function defineServerSideTool<T extends z.ZodType>(
  tool: ServerSideTool<T>,
): ServerSideTool<T> {
  return tool
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Recursively strip $schema and additionalProperties from a JSON Schema object.
 * These are unnecessary for the LLM and waste context window tokens.
 */
export function stripSchemaOverhead(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map(stripSchemaOverhead)
  }
  if (typeof obj === 'object' && obj !== null) {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      if (key === '$schema' || key === 'additionalProperties') continue
      if (key === 'propertyNames') continue
      result[key] = stripSchemaOverhead(value)
    }
    return result
  }
  return obj
}

/**
 * Build a ClientToolDefinition from a ServerSideTool for a given context.
 * Returns null when the tool should not be offered this turn.
 */
export function buildDefinition(
  tool: ServerSideTool,
  ctx: ToolDefinitionContext,
): ClientToolDefinition | null {
  if (tool.isAvailable && !tool.isAvailable(ctx)) {
    return null
  }
  const schema = tool.inputSchema(ctx)
  return {
    name: tool.name,
    description: tool.description,
    input_schema: stripSchemaOverhead(z.toJSONSchema(schema)) as Record<
      string,
      unknown
    >,
  }
}
