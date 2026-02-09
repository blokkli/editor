import { z } from 'zod'

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
 * Content block in a message.
 */
export type GenericContentBlock =
  | GenericTextBlock
  | GenericSkillBlock
  | GenericToolUseBlock
  | GenericToolResultBlock

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
  blockFields: BlockBundleBlockField[]
}

/**
 * Edit mode determines what actions the user is allowed to perform.
 */
export type EditMode = 'readonly' | 'editing' | 'translating' | 'review'

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
  blockFields: z.array(blockBundleBlockFieldSchema),
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
})

const clientToolDefinitionSchema = z.object({
  name: z.string(),
  description: z.string(),
  input_schema: z.record(z.string(), z.unknown()),
  lazy: z.boolean().optional(),
  category: z.enum(['query', 'mutation']).optional(),
  volatile: z.boolean().optional(),
})

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
    tools: z.array(clientToolDefinitionSchema),
    pageContext: pageContextSchema,
  }),
  z.object({
    type: z.literal('start'),
    prompt: z.string(),
    selectedUuids: z.array(z.string()).optional(),
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
    }
  | { type: 'transcript'; content: string }
  | {
      type: 'server_tool_result'
      tool: 'load_skill' | 'load_tools' | 'create_plan' | 'complete_plan_step'
      label: string
    }
  | { type: 'plan_update'; plan: ClientPlanState | null }
  | { type: 'conversation_state'; state: ConversationStateSnapshot }
  | { type: 'conversation_restored' }
  | { type: 'conversation_restore_failed'; reason: string }
