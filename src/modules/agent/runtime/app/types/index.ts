import type { BlokkliApp } from '#blokkli/editor/types/app'
import type {
  FullBlokkliAdapter,
  MutationResponseLike,
  AdapterMethods,
} from '#blokkli/editor/adapter'
import type { EditMode } from '#blokkli/editor/types/state'
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
  /** Data to include in the success result sent to AI (e.g., { blockUuid }) */
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
   * Optional function returning mock params for styling/debugging.
   * When provided, the debug view will render the component with these params.
   */
  mockParams?: () => z.infer<TParamsSchema>
}

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
 * A completed tool call in the conversation history.
 */
export type ToolConversationItem = ConversationItemBase & {
  type: 'tool'
  callId: string
  tool: string
  label: string
  status: 'success' | 'error'
}

/**
 * Finalized items in conversation history (never modified after being pushed).
 */
export type ConversationItem =
  | UserConversationItem
  | AssistantConversationItem
  | ToolConversationItem

/**
 * Assistant message being streamed (content may grow).
 */
export type AssistantActiveItem = {
  type: 'assistant'
  id: string
  content: string
  timestamp: number
}

/**
 * Tool call in progress (pending execution or awaiting approval).
 */
export type ToolActiveItem = {
  type: 'tool'
  id: string
  callId: string
  tool: string
  label: string
  timestamp: number
}

/**
 * The single item currently being built (streaming text or pending tool).
 * Only one active item can exist at a time. When complete, it's pushed to conversation history.
 */
export type ActiveItem = AssistantActiveItem | ToolActiveItem
