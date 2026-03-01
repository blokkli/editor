import { z } from 'zod'

// ============================================================================
// Model Definition
// ============================================================================

/**
 * Defines an AI model with optional pricing for cost calculation.
 */
export type AgentModelDefinition = {
  /** Model identifier passed to the AI provider (e.g. 'claude-haiku-4-5'). */
  name: string
  /** Human-readable label shown in the UI. */
  label: string
  /** Whether this is the default model. The first model is used if none is marked. */
  isDefault?: boolean
  /**
   * Whether this model is used for prompt routing.
   * When true, the agent makes a fast LLM call before the main loop to
   * pre-load relevant skills and tools based on the user's first message.
   * If no model has `routing: true`, the default model is used.
   */
  routing?: boolean
  /** Per-million-token pricing. When set, cost is computed and shown in the UI. */
  pricing?: {
    input: number
    cacheWrite: number
    cacheRead: number
    output: number
  }
}

// ============================================================================
// Generic Message Types (used by both server and client)
// ============================================================================

/**
 * Text content block in a message.
 */
export type GenericTextBlock = {
  type: 'text'
  text: string
}

/**
 * Skill content block - loaded skill guidelines injected into the conversation.
 * Providers serialize this as a text block for the API.
 */
export type GenericSkillBlock = {
  type: 'skill'
  name: string
  text: string
}

/**
 * Tool use content block - assistant requesting tool execution.
 */
export type GenericToolUseBlock = {
  type: 'tool_use'
  id: string
  name: string
  input: unknown
}

/**
 * Tool result content block - result of tool execution.
 */
export type GenericToolResultBlock = {
  type: 'tool_result'
  tool_use_id: string
  content: string
  is_error?: boolean
}

/**
 * Reasoning summary block - captures reasoning model chain-of-thought.
 * OpenAI reasoning models emit these; they must be fed back to maintain
 * coherent multi-turn tool-calling behavior.
 */
export type GenericReasoningBlock = {
  type: 'reasoning'
  id: string
  text: string
  encryptedContent?: string
}

/**
 * Content block in a message.
 */
export type GenericContentBlock =
  | GenericTextBlock
  | GenericSkillBlock
  | GenericToolUseBlock
  | GenericToolResultBlock
  | GenericReasoningBlock

/**
 * Generic message format used internally.
 * Provider implementations convert to/from this format.
 */
export type GenericMessage = {
  role: 'user' | 'assistant'
  content: string | GenericContentBlock[]
}

// ============================================================================
// Conversation Persistence Types
// ============================================================================

/**
 * Snapshot of conversation state for persistence.
 * Sent from server to client after each completed turn.
 * The hash prevents client-side tampering.
 */
export type ConversationStateSnapshot = {
  messages: GenericMessage[]
  activatedLazyTools: string[]
  hash: string
}

// ============================================================================
// Page Context Types
// ============================================================================

/**
 * Content field metadata for a block bundle.
 * Unifies editable text fields and droppable reference/link fields.
 */
export type BlockBundleContentField =
  | { name: string; label: string; type: 'plain' | 'markup' }
  | {
      name: string
      label: string
      type: 'reference' | 'link'
      allowed: { type: string; bundles: string[] }[]
    }

/**
 * Block field (nested blocks) metadata for a block bundle.
 */
export type BlockBundleBlockField = {
  name: string
  label: string
  allowedBundles: string[]
  cardinality: number
}

/**
 * Block bundle definition with field metadata.
 */
export type BlockBundle = {
  id: string
  label: string
  description?: string
  contentFields: BlockBundleContentField[]
  paragraphFields: BlockBundleBlockField[]
}

/**
 * Edit mode determines what actions the user is allowed to perform.
 */
export type EditMode = 'readonly' | 'editing' | 'translating' | 'review'

/**
 * Server-side tool metadata extracted at build time.
 * Contains only static properties needed by the server — no execute(), label(),
 * component, or other runtime-only fields.
 */
export type ServerToolMetadata = {
  name: string
  description: string
  category: 'query' | 'mutation'
  modes: EditMode[]
  paramsSchema: z.ZodType
  lazy?: boolean
  volatile?: boolean
  requiredAdapterMethods?: string[]
}

/**
 * Fragment definition for reusable content blocks.
 */
export type Fragment = {
  name: string
  label: string
  description?: string
}

/**
 * Page context sent from client to server on init.
 * Provides the AI agent with knowledge of the page and available block types.
 */
export type PageContext = {
  /** The page title */
  title: string
  /** The page entity type (use this as parent.type when adding root-level blocks) */
  entityType: string
  /** The page entity UUID (use this as parent.uuid when adding root-level blocks) */
  entityUuid: string
  /** The page bundle machine name (e.g., "page", "article") */
  entityBundle: string
  /** The page bundle label (e.g., "Article", "Landing Page") */
  bundleLabel: string
  /** The item entity type for blocks */
  itemEntityType: string
  /** Available block bundles */
  bundles: BlockBundle[]
  /** The UI/interface language code (e.g., "en", "de") */
  interfaceLanguage: string
  /** The content/entity language code (e.g., "en", "de") */
  entityLanguage: string
  /** Whether the entity is published or null if entity is not publishable */
  isPublished: boolean | null
  /** The current edit mode - determines what actions are available */
  editMode: EditMode
  /** Available fragments (reusable content blocks) */
  fragments: Fragment[]
  /** Content fields on the page entity itself (e.g., lead text, hero image) */
  entityContentFields: BlockBundleContentField[]
  /** Available content search tabs (for the search_content tool) */
  contentSearchTabs?: {
    id: string
    title: string
    types: { type: string; bundles: string[] }[]
  }[]
  /** Available content analyzers (for the get_readability_issues tool) */
  analyzers?: {
    id: string
    type?: string
    label?: string
    description?: string
  }[]
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Classified error categories for AI provider errors.
 * Both Anthropic and OpenAI SDKs map to these via HTTP status codes.
 */
export const agentErrorTypeSchema = z.enum([
  'authentication', // 401 — bad API key
  'rate_limit', // 429 — too many requests
  'overloaded', // 529 (Anthropic) / 503 — service overloaded
  'not_found', // 404 — invalid model or endpoint
  'bad_request', // 400 — malformed request
  'connection', // Network/connection failure
  'unauthorized', // WebSocket auth token invalid or missing
  'unknown', // Anything else
])

export type AgentErrorType = z.infer<typeof agentErrorTypeSchema>

// ============================================================================
// Plan Types
// ============================================================================

/**
 * A single step in a plan as seen by the client (no description — that stays server-side).
 */
export type ClientPlanStep = {
  label: string
  status: 'pending' | 'in_progress' | 'completed'
}

/**
 * Plan state sent to the client. Contains only labels and statuses,
 * not the detailed descriptions that the LLM uses internally.
 */
export type ClientPlanState = {
  title: string
  steps: ClientPlanStep[]
}

// ============================================================================
// Usage Tracking
// ============================================================================

/**
 * Token pricing rates per million tokens, captured at the time of the turn.
 */
export type UsagePricing = {
  input: number
  cacheWrite: number
  cacheRead: number
  output: number
}

/**
 * A single usage turn as sent by the server and stored by the client.
 * Contains raw token counts and the pricing that was active at the time,
 * so cost can be computed correctly even after pricing changes.
 */
export type UsageTurn = {
  inputTokens: number
  outputTokens: number
  cacheCreationInputTokens: number
  cacheReadInputTokens: number
  pricing: UsagePricing | null
}

// ============================================================================
// Transcript Types
// ============================================================================

/**
 * A single system prompt entry in the structured transcript.
 */
export type TranscriptSystemPrompt = {
  id: string
  name: string
  content: string
}

/**
 * A single message in the structured transcript.
 * `seen` is the pruned content actually sent to the LLM.
 * `full` is the pre-pruned content, omitted when identical to `seen`.
 */
export type TranscriptMessage = {
  type: 'agent' | 'user'
  seen: string | GenericContentBlock[]
  full?: string | GenericContentBlock[]
}

/**
 * Tool definition as included in the transcript.
 */
export type TranscriptToolDefinition = {
  name: string
  description: string
  input_schema: Record<string, unknown>
}

/**
 * Structured transcript of the current conversation state.
 */
export type Transcript = {
  system: TranscriptSystemPrompt[]
  messages: TranscriptMessage[]
  tools: TranscriptToolDefinition[]
  /** Raw request payload from the last provider call (dev only). */
  lastRequest?: unknown
}

// ============================================================================
// WebSocket Protocol Messages
// ============================================================================

/**
 * Tool definition sent from client to server on init.
 */
export type ClientToolDefinition = {
  name: string
  description: string
  input_schema: Record<string, unknown>
  lazy?: boolean
  category?: 'query' | 'mutation'
  volatile?: boolean
}

/**
 * Validation schemas for client messages.
 * These are the single source of truth — the ClientMessage type is derived below.
 */

const blockBundleContentFieldSchema = z.union([
  z.object({
    name: z.string(),
    label: z.string(),
    type: z.enum(['plain', 'markup']),
  }),
  z.object({
    name: z.string(),
    label: z.string(),
    type: z.enum(['reference', 'link']),
    allowed: z.array(
      z.object({
        type: z.string(),
        bundles: z.array(z.string()),
      }),
    ),
  }),
])

const blockBundleBlockFieldSchema = z.object({
  name: z.string(),
  label: z.string(),
  allowedBundles: z.array(z.string()),
  cardinality: z.number(),
})

const blockBundleSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string().optional(),
  contentFields: z.array(blockBundleContentFieldSchema),
  paragraphFields: z.array(blockBundleBlockFieldSchema),
})

const fragmentSchema = z.object({
  name: z.string(),
  label: z.string(),
  description: z.string().optional(),
})

const pageContextSchema = z.object({
  title: z.string(),
  entityType: z.string(),
  entityUuid: z.string(),
  entityBundle: z.string(),
  bundleLabel: z.string(),
  itemEntityType: z.string(),
  bundles: z.array(blockBundleSchema),
  interfaceLanguage: z.string(),
  entityLanguage: z.string(),
  isPublished: z.boolean().nullable(),
  editMode: z.enum(['readonly', 'editing', 'translating', 'review']),
  fragments: z.array(fragmentSchema),
  entityContentFields: z.array(blockBundleContentFieldSchema),
  contentSearchTabs: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        types: z.array(
          z.object({
            type: z.string(),
            bundles: z.array(z.string()),
          }),
        ),
      }),
    )
    .optional(),
  analyzers: z
    .array(
      z.object({
        id: z.string(),
        type: z.string().optional(),
        label: z.string().optional(),
        description: z.string().optional(),
      }),
    )
    .optional(),
})

export type PageStructureBlock = {
  uuid: string
  bundle: string
  contentFields?: Record<string, string>
  fields?: Record<string, PageStructureBlock[]>
}

const pageStructureBlockSchema: z.ZodType<PageStructureBlock> = z.lazy(() =>
  z.object({
    uuid: z.string(),
    bundle: z.string(),
    contentFields: z.record(z.string(), z.string()).optional(),
    fields: z.record(z.string(), z.array(pageStructureBlockSchema)).optional(),
  }),
)

export const pageStructureSchema = z.object({
  totalParagraphs: z.number(),
  fields: z.record(z.string(), z.array(pageStructureBlockSchema)),
  entityContentFields: z.record(z.string(), z.string()).optional(),
})

export type PageStructure = z.infer<typeof pageStructureSchema>

const genericContentBlockSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), text: z.string() }),
  z.object({ type: z.literal('skill'), name: z.string(), text: z.string() }),
  z.object({
    type: z.literal('tool_use'),
    id: z.string(),
    name: z.string(),
    input: z.unknown(),
  }),
  z.object({
    type: z.literal('tool_result'),
    tool_use_id: z.string(),
    content: z.string(),
    is_error: z.boolean().optional(),
  }),
  z.object({
    type: z.literal('reasoning'),
    id: z.string(),
    text: z.string(),
    encryptedContent: z.string().optional(),
  }),
])

const genericMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.union([z.string(), z.array(genericContentBlockSchema)]),
})

const conversationStateSnapshotSchema = z.object({
  messages: z.array(genericMessageSchema),
  activatedLazyTools: z.array(z.string()),
  hash: z.string(),
})

export const clientMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('authenticate'), authToken: z.string() }),
  z.object({
    type: z.literal('init'),
    toolNames: z.array(z.string()),
    pageContext: pageContextSchema,
  }),
  z.object({
    type: z.literal('start'),
    prompt: z.string(),
    selectedUuids: z.array(z.string()).optional(),
    autoLoadTools: z.array(z.string()).optional(),
    autoLoadSkills: z.array(z.string()).optional(),
    preSeededResults: z
      .array(
        z.object({
          toolName: z.string(),
          params: z.record(z.string(), z.unknown()),
          result: z.unknown(),
        }),
      )
      .optional(),
    autoExecuteTools: z
      .array(
        z.object({
          toolName: z.string(),
          params: z.record(z.string(), z.unknown()),
        }),
      )
      .optional(),
  }),
  z.object({
    type: z.literal('tool_result'),
    callId: z.string(),
    result: z.unknown(),
    error: z.string().optional(),
  }),
  z.object({ type: z.literal('cancel') }),
  z.object({ type: z.literal('accept') }),
  z.object({ type: z.literal('reject') }),
  z.object({ type: z.literal('get_transcript') }),
  z.object({ type: z.literal('new_conversation') }),
  z.object({
    type: z.literal('restore_conversation'),
    state: conversationStateSnapshotSchema,
  }),
  z.object({ type: z.literal('plan_approve') }),
  z.object({ type: z.literal('plan_reject') }),
  z.object({ type: z.literal('ping') }),
])

/**
 * Messages sent from client to server over WebSocket.
 */
export type ClientMessage = z.infer<typeof clientMessageSchema>

/**
 * Messages sent from server to client over WebSocket.
 */
export type ServerMessage =
  | { type: 'authenticated' }
  | {
      type: 'tool_call'
      callId: string
      tool: string
      params: Record<string, unknown>
    }
  | { type: 'thinking'; content?: string }
  | { type: 'text'; content: string }
  | { type: 'text_delta'; content: string }
  | { type: 'done'; message?: string }
  | {
      type: 'error'
      errorType: AgentErrorType
      message: string
      detail?: string
      retryable?: boolean
    }
  | { type: 'transcript'; transcript: Transcript }
  | {
      type: 'server_tool_result'
      tool: 'load_skills' | 'load_tools' | 'create_plan' | 'complete_plan_step'
      label: string
    }
  | { type: 'plan_update'; plan: ClientPlanState | null }
  | { type: 'conversation_state'; state: ConversationStateSnapshot }
  | { type: 'usage'; usage: UsageTurn }
  | { type: 'conversation_restored' }
  | { type: 'conversation_restore_failed'; reason: string }
