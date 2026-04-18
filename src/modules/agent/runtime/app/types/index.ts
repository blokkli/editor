import type { BlokkliApp } from '#blokkli/editor/types/app'
import type {
  FullBlokkliAdapter,
  MutationResponseLike,
  AdapterMethods,
} from '#blokkli/editor/adapter'
import type { EditMode } from '#blokkli/editor/types/state'
import { agentErrorTypeSchema } from '#blokkli/agent/shared/types'
import { z } from 'zod'
import type { Component } from 'vue'
import type {
  AgentToolName,
  AgentSkillName,
  AgentToolMap,
} from '#blokkli-build/agent-client'

// ============================================================================
// Tool Definitions - Common Types
// ============================================================================

/**
 * Translation function type (matches $t from BlokkliApp).
 */
export type TranslationFunction = (key: string, defaultValue: string) => string

/**
 * A host entity (parent of a block).
 * Used consistently across tools for specifying block locations.
 */
export type Host = {
  type: string
  uuid: string
  field: string
}

// ============================================================================
// Tool Definitions - Mutation Actions
// ============================================================================

export type McpToolCategory = 'query' | 'mutation'

/**
 * Result shape for mutation tools after the framework applies the mutation.
 * This is the type passed to `prunedSummary` for non-component mutation tools.
 */
export type MutationToolResult =
  | {
      success: true
      historyIndex: number
      newParagraphs?: Array<{
        uuid: string
        bundle: string
        paragraphFields?: string[]
      }>
    }
  | {
      success: false
      rejected?: true
    }

/**
 * Result from a query tool - includes a label for UI display
 * and the actual result data sent to the LLM.
 */
export type QueryResult<T = unknown> = {
  /** Human-readable label for display in conversation UI */
  label: string
  /** The actual result data sent to the LLM */
  result: T
  /**
   * UUIDs of blocks related to this query.
   * The framework will select these blocks and scroll them into view.
   */
  affectedUuids?: string[]
}

/**
 * Error result that can be returned by any tool.
 */
export type ToolError = {
  error: string
}

/**
 * Makes specified adapter methods required (non-optional).
 */
export type RequireAdapterMethods<
  T extends FullBlokkliAdapter<any>,
  Methods extends readonly AdapterMethods[],
> = Omit<T, Methods[number]> & Required<Pick<T, Methods[number] & keyof T>>

/**
 * A mutation action returned by mutation tools.
 * The framework handles user approval and executes apply() when approved.
 *
 * @typeParam Methods - Adapter methods that are guaranteed to exist on the adapter.
 */
export type MutationAction<
  Methods extends readonly AdapterMethods[] = readonly [],
> = {
  /** Type of mutation (for UI display) */
  type: 'add' | 'delete' | 'move' | 'rewrite' | 'options'
  /** Human-readable description for UI */
  label: string
  /** The apply function - called when user accepts */
  apply: (
    adapter: RequireAdapterMethods<FullBlokkliAdapter<any>, Methods>,
  ) => Promise<MutationResponseLike<any>> | undefined
  /** Optional revert function - called when user rejects (for rewrite preview) */
  revert?: () => void
  /** Data to include in the success result sent to AI */
  result?: Record<string, unknown>
  /**
   * UUIDs of blocks affected by this mutation.
   * The framework will select these blocks and scroll them into view after apply.
   */
  affectedUuids?: string[]
}

/**
 * Context provided to tool execute functions.
 * The adapter type has required methods marked as non-optional.
 */
export type McpToolContext<
  Methods extends readonly AdapterMethods[] = readonly [],
> = {
  /** The blokkli app instance */
  app: BlokkliApp

  /** Item entity type from module config */
  itemEntityType: string

  /** The adapter with required methods guaranteed to exist */
  adapter: Methods extends readonly AdapterMethods[]
    ? RequireAdapterMethods<FullBlokkliAdapter<any>, Methods>
    : FullBlokkliAdapter<any>

  /** The page context built during connection, available for tools that need it */
  pageContext: import('#blokkli/agent/shared/types').PageContext | null
}

/**
 * Base definition for an MCP tool using Zod schemas.
 *
 * For query tools (category: 'query'):
 *   execute() returns QueryResult<T> or ToolError.
 *   QueryResult includes a label for UI display and the result data.
 *
 * For mutation tools (category: 'mutation'):
 *   execute() returns a MutationAction or ToolError.
 *   The framework handles user approval and formats the response.
 *
 * For tools with a component:
 *   execute() returns data to pass to the component
 *   The component emits the final result matching resultSchema
 */
export type McpToolDefinition<
  TParamsSchema extends z.ZodType = z.ZodType,
  TResultSchema extends z.ZodType = z.ZodType,
  TMethods extends readonly AdapterMethods[] = readonly [],
  TComponent extends Component | undefined = undefined,
  TCategory extends McpToolCategory = McpToolCategory,
> = {
  /** Unique tool name (snake_case) */
  name: string

  /** Description shown to the AI model */
  description: string

  /** Optional icon name */
  icon?: string

  /** Tool category: 'query' for immediate execution, 'mutation' for user approval */
  category: TCategory

  /**
   * Returns the label to display while the tool is executing.
   * This is shown before the tool completes and provides its final label.
   */
  label: ($t: TranslationFunction) => string

  /** Zod schema for input parameters */
  paramsSchema: TParamsSchema

  /** Zod schema for the result */
  resultSchema: TResultSchema

  /** Optional: adapter methods required for this tool to be available */
  requiredAdapterMethods?: TMethods

  /**
   * Edit modes in which this tool is available.
   * - 'editing': Full access, all tools available
   * - 'translating': Only text-changing tools + query tools
   * - 'readonly': Only query tools (read-only operations)
   * - 'review': Only query tools (read-only operations)
   */
  modes: EditMode[]

  /**
   * Optional Vue component for interactive tools.
   *
   * When provided, the component receives { context, params } props and must
   * emit a 'done' event with the result. The component is responsible for:
   * - Rendering the UI for user interaction
   * - Applying changes via the adapter
   * - Emitting the final result back to the AI
   *
   * Use this for tools that need user interaction beyond simple approve/reject,
   * such as batch operations with selective approval.
   */
  component?: TComponent

  /**
   * Function to execute the tool.
   *
   * Query tools: Return QueryResult<T> with label for UI display.
   * Mutation tools: Return a MutationAction or ToolError.
   *
   * For tools with a component:
   * - The execute function is called first, and its result is passed to the component as params
   * - The component handles all user interaction and emits the final result
   */
  execute: (
    context: McpToolContext<TMethods>,
    params: z.infer<TParamsSchema>,
  ) => TComponent extends Component
    ? unknown | Promise<unknown>
    : TCategory extends 'mutation'
      ?
          | MutationAction<TMethods>
          | ToolError
          | Promise<MutationAction<TMethods> | ToolError>
      :
          | QueryResult<z.infer<TResultSchema>>
          | ToolError
          | Promise<QueryResult<z.infer<TResultSchema>> | ToolError>

  /**
   * If true, mutation tools require explicit user approval before applying.
   * When false or omitted, mutations are applied immediately.
   * Only relevant for tools with category 'mutation'.
   */
  requiresApproval?: boolean

  /**
   * If true, this tool is not sent to the LLM until activated via load_tools.
   * Lazy tools are listed by name + description in the system prompt so the
   * LLM knows they exist and can load them on demand.
   */
  lazy?: boolean

  /**
   * Runtime predicate that gates tool availability.
   *
   * Called once at connection time; the tool is excluded from the list sent
   * to the LLM when this returns (or resolves to) `false`. Receives the full
   * `BlokkliApp` so it can inspect provider state — e.g. a tool that relies
   * on readability can return `app.readability.isAvailable.value`.
   *
   * Use this for capabilities that may be switched off at the project level.
   * For static dependencies on adapter methods, prefer `requiredAdapterMethods`.
   */
  isAvailable?: (app: BlokkliApp) => boolean | Promise<boolean>

  /**
   * Whether results become stale after any mutation.
   * When true, old results from this tool are marked as stale during pruning.
   * Typical for query tools that return page structure (e.g. get_child_blocks).
   */
  volatile?: boolean

  /**
   * Callback to compute a pruning summary from the tool result.
   * Called client-side after tool execution. The returned string is included
   * as `_summary` in the result sent to the server, and used during pruning
   * instead of the generic fallback.
   *
   * The result type depends on the tool category:
   * - Query tools / component tools: `z.infer<TResultSchema>`
   * - Mutation tools (no component): `MutationToolResult`
   */
  prunedSummary?: (
    result: TComponent extends Component
      ? z.infer<TResultSchema>
      : TCategory extends 'query'
        ? z.infer<TResultSchema>
        : MutationToolResult,
  ) => string

  /**
   * Optional callback that extracts detail data from the tool result.
   * Called after tool execution. The returned value is stored in memory
   * (not persisted) and passed to detailsComponent when expanded.
   */
  buildDetails?: (result: any) => unknown

  /**
   * Optional Vue component rendered inside the collapsible details area.
   * Receives { details: unknown } as props (the value from buildDetails).
   */
  detailsComponent?: Component

  /**
   * Optional function returning mock params for styling/debugging.
   * When provided, the debug view will render the component with these params.
   */
  mockParams?: () => z.infer<TParamsSchema>

  /**
   * Optional additional mock param variants for the debug gallery.
   * Each entry renders an extra instance of the component.
   */
  mockParamsVariants?: () => z.infer<TParamsSchema>[]
}

// ============================================================================
// Agent Prompt Definitions
// ============================================================================

/**
 * A tool result that was pre-computed client-side before the prompt is sent.
 * Injected into conversation history as synthetic assistant/user message pairs.
 */
export type PreSeededToolResult = {
  toolName: string
  params: Record<string, unknown>
  result: unknown
  /** Human-readable label for display in the conversation UI (client-only). */
  label: string
}

/**
 * A tool call to dispatch to the client before the LLM loop starts.
 * The server sends it as a normal tool_call and waits for the result.
 */
export type AutoExecuteTool = {
  toolName: string
  params: Record<string, unknown>
}

/**
 * A pre-defined agent prompt that users can select.
 */
export type AgentPromptDefinition = {
  /** Unique prompt ID */
  id: string
  /** Returns the label shown in the UI */
  getLabel: (app: BlokkliApp) => string
  /** Returns the prompt text sent to the agent */
  getPrompt: (app: BlokkliApp) => string
  /** Optional: returns the prompt text shown in the conversation UI. Defaults to getPrompt. */
  getUserPrompt?: (app: BlokkliApp) => string
  /** Lazy tool names to auto-activate when this prompt is sent. */
  tools?: AgentToolName[]
  /** Skill names to auto-load when this prompt is sent. */
  skills?: AgentSkillName[]
  /**
   * Optional async callback that runs client-side before the prompt is sent.
   * Can pre-compute tool results and declare tool calls to auto-dispatch,
   * saving LLM round trips for predictable tool sequences.
   */
  preExecute?: (ctx: {
    app: BlokkliApp
    selectedUuids: string[]
    runTool: <T extends AgentToolName>(
      toolName: T,
      params: AgentToolMap[T]['params'],
    ) => Promise<PreSeededToolResult & { result: AgentToolMap[T]['result'] }>
  }) => Promise<{
    preSeededResults?: PreSeededToolResult[]
    autoExecuteTools?: AutoExecuteTool[]
  } | void>
}

/**
 * Input for a prompt factory that dynamically creates prompts at runtime.
 */
export type AgentPromptFactoryInput = {
  /**
   * Called to resolve prompts dynamically based on runtime state.
   */
  resolve: (app: BlokkliApp) => AgentPromptDefinition[] | AgentPromptDefinition
}

/**
 * A prompt factory with the __factory marker for runtime identification.
 */
export type AgentPromptFactory = AgentPromptFactoryInput & {
  __factory: true
}

/**
 * A prompt item is either a static prompt definition or a factory that produces prompts.
 */
export type AgentPromptItem = AgentPromptDefinition | AgentPromptFactory

// ============================================================================
// Agent State Types - Flat Conversation Model
// ============================================================================

/**
 * Base properties shared by all conversation items.
 */
const conversationItemBase = z.object({
  id: z.string(),
  timestamp: z.number(),
})

/**
 * A user message in the conversation history.
 */
const userConversationItemSchema = conversationItemBase.extend({
  type: z.literal('user'),
  content: z.string(),
  attachments: z
    .array(
      z.object({
        type: z.literal('text'),
        id: z.string(),
        content: z.string(),
        format: z.enum(['plaintext', 'markdown', 'html', 'csv', 'code']),
      }),
    )
    .optional(),
})

/**
 * An assistant text message in the conversation history.
 */
const assistantConversationItemSchema = conversationItemBase.extend({
  type: z.literal('assistant'),
  content: z.string(),
})

/**
 * A tool call in the conversation history.
 * Status is 'active' while executing, then 'success' or 'error' when complete.
 */
const toolConversationItemSchema = conversationItemBase.extend({
  type: z.literal('tool'),
  callId: z.string(),
  tool: z.string(),
  label: z.string(),
  status: z.enum(['active', 'success', 'error']),
})

/**
 * A server-side tool call result in the conversation history.
 */
const serverToolConversationItemSchema = conversationItemBase.extend({
  type: z.literal('server_tool'),
  tool: z.enum([
    'load_skills',
    'load_tools',
    'create_plan',
    'complete_plan_step',
    'plan_completed',
  ]),
  label: z.string(),
})

/**
 * An error message in the conversation history.
 */
const errorConversationItemSchema = conversationItemBase.extend({
  type: z.literal('error'),
  errorType: agentErrorTypeSchema,
  retryable: z.boolean().optional(),
})

/**
 * Discriminated union of all conversation item schemas.
 */
export const conversationItemSchema = z.discriminatedUnion('type', [
  userConversationItemSchema,
  assistantConversationItemSchema,
  toolConversationItemSchema,
  serverToolConversationItemSchema,
  errorConversationItemSchema,
])

export type UserConversationItem = z.infer<typeof userConversationItemSchema>
export type AssistantConversationItem = z.infer<
  typeof assistantConversationItemSchema
>
export type ToolConversationItem = z.infer<typeof toolConversationItemSchema>
export type ServerToolConversationItem = z.infer<
  typeof serverToolConversationItemSchema
>
export type ErrorConversationItem = z.infer<typeof errorConversationItemSchema>

/**
 * A conversation item that failed validation when restoring from persistence.
 * Displayed as a placeholder so the user sees something went wrong.
 */
export type UnknownConversationItem = {
  type: 'unknown'
  id: string
  timestamp: number
}

/**
 * Finalized items in conversation history (never modified after being pushed).
 */
export type ConversationItem =
  | z.infer<typeof conversationItemSchema>
  | UnknownConversationItem

/**
 * The single item currently being built (streaming text or pending tool).
 * Only one active item can exist at a time. When complete, it's pushed to conversation history.
 */
export type ActiveItem = AssistantConversationItem | ToolConversationItem

// ============================================================================
// Attachment Types
// ============================================================================

export type AttachmentFormat =
  | 'plaintext'
  | 'markdown'
  | 'html'
  | 'csv'
  | 'code'

export type TextAttachment = {
  type: 'text'
  id: string
  content: string
  format: AttachmentFormat
}

export type Attachment = TextAttachment
