import type { BlokkliApp } from '#blokkli/editor/types/app'
import type {
  FullBlokkliAdapter,
  MutationResponseLike,
  AdapterMethods,
} from '#blokkli/editor/adapter'
import type { EditMode } from '#blokkli/editor/types/state'
import type { AgentErrorType } from '#blokkli/agent/shared/types'
import type { z } from 'zod'
import type { Component } from 'vue'

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
   * Optional function returning mock params for styling/debugging.
   * When provided, the debug view will render the component with these params.
   */
  mockParams?: () => z.infer<TParamsSchema>
}

// ============================================================================
// Tool Factory Definitions
// ============================================================================

/**
 * A tool definition with a relaxed execute signature.
 *
 * Used as the return type for factory resolve callbacks. Preserves structural
 * checking on all other properties (catches typos and excess properties) while
 * allowing each tool to have its own specific execute signature via
 * defineBlokkliAgentTool().
 */
export type FactoryResolvedTool = {
  name: string
  description: string
  icon?: string
  category: McpToolCategory
  label: ($t: TranslationFunction) => string
  paramsSchema: z.ZodType
  resultSchema: z.ZodType
  requiredAdapterMethods?: readonly AdapterMethods[]
  modes: EditMode[]
  component?: Component
  requiresApproval?: boolean
  lazy?: boolean
  execute: (...args: any[]) => any
  mockParams?: () => any
}

/**
 * Input for a tool factory that dynamically creates tools at runtime.
 *
 * Instead of defining a single static tool, a factory uses a `resolve` callback
 * that is called when the agent connects. The callback returns an array of
 * McpToolDefinition objects, allowing tools to be created based on runtime state
 * (e.g., available content search tabs from the adapter).
 */
export type McpToolFactoryInput = {
  /**
   * Called once when the agent connects. Returns an array of tool definitions
   * that are registered as if they were statically defined.
   *
   * Each returned tool is a full McpToolDefinition with its own
   * requiredAdapterMethods, execute function, and schemas. Use
   * defineBlokkliAgentTool() for each tool to get full type inference.
   *
   * The context provides access to the app and adapter so the factory can
   * query runtime state (e.g., available content search tabs) to decide
   * which tools to create. If adapter methods are optional, check for their
   * existence before calling them (or return an empty array).
   */
  resolve: (
    context: McpToolContext,
  ) => Promise<FactoryResolvedTool[]> | FactoryResolvedTool[]
}

/**
 * A tool factory with the __factory marker for runtime identification.
 */
export type McpToolFactory = McpToolFactoryInput & {
  __factory: true
}

/**
 * A tool item is either a static tool definition or a factory that produces tools.
 */
export type McpToolItem = McpToolDefinition | McpToolFactory

// ============================================================================
// Agent Prompt Definitions
// ============================================================================

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
type ConversationItemBase = {
  id: string
  timestamp: number
}

/**
 * A user message in the conversation history.
 */
export type UserConversationItem = ConversationItemBase & {
  type: 'user'
  content: string
}

/**
 * An assistant text message in the conversation history.
 */
export type AssistantConversationItem = ConversationItemBase & {
  type: 'assistant'
  content: string
}

/**
 * A tool call in the conversation history.
 * Status is 'active' while executing, then 'success' or 'error' when complete.
 */
export type ToolConversationItem = ConversationItemBase & {
  type: 'tool'
  callId: string
  tool: string
  label: string
  status: 'active' | 'success' | 'error'
}

/**
 * A server-side tool call result in the conversation history.
 */
export type ServerToolConversationItem = ConversationItemBase & {
  type: 'server_tool'
  tool: 'load_skill' | 'load_tools'
  label: string
}

/**
 * An error message in the conversation history.
 */
export type ErrorConversationItem = ConversationItemBase & {
  type: 'error'
  errorType: AgentErrorType
}

/**
 * Finalized items in conversation history (never modified after being pushed).
 */
export type ConversationItem =
  | UserConversationItem
  | AssistantConversationItem
  | ToolConversationItem
  | ServerToolConversationItem
  | ErrorConversationItem

/**
 * The single item currently being built (streaming text or pending tool).
 * Only one active item can exist at a time. When complete, it's pushed to conversation history.
 */
export type ActiveItem = AssistantConversationItem | ToolConversationItem
