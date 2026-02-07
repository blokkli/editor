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
  /** The name of the page owner (person who created/owns the content) */
  ownerName?: string
  /** The UI/interface language code (e.g., "en", "de") */
  interfaceLanguage?: string
  /** The content/entity language code (e.g., "en", "de") */
  entityLanguage?: string
  /** Whether the entity is published */
  isPublished?: boolean
  /** The current edit mode - determines what actions are available */
  editMode: EditMode
  /** Available fragments (reusable content blocks) */
  fragments: Fragment[]
  /** Content fields on the page entity itself (e.g., lead text, hero image) */
  entityContentFields?: BlockBundleContentField[]
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Classified error categories for AI provider errors.
 * Both Anthropic and OpenAI SDKs map to these via HTTP status codes.
 */
export type AgentErrorType =
  | 'authentication' // 401 — bad API key
  | 'rate_limit' // 429 — too many requests
  | 'overloaded' // 529 (Anthropic) / 503 — service overloaded
  | 'not_found' // 404 — invalid model or endpoint
  | 'bad_request' // 400 — malformed request
  | 'connection' // Network/connection failure
  | 'unknown' // Anything else

// ============================================================================
// WebSocket Protocol Messages
// ============================================================================

/**
 * Tool definition sent from client to server on init.
 */
export type ClientToolDefinition = {
  name: string
  description: string
  input_schema: object
  lazy?: boolean
}

/**
 * Messages sent from client to server over WebSocket.
 */
export type ClientMessage =
  | { type: 'init'; tools: ClientToolDefinition[]; pageContext: PageContext }
  | { type: 'start'; prompt: string; selectedUuids?: string[] }
  | { type: 'tool_result'; callId: string; result: unknown; error?: string }
  | { type: 'cancel' }
  | { type: 'accept' }
  | { type: 'reject' }
  | { type: 'get_transcript' }
  | { type: 'new_conversation' }

/**
 * Messages sent from server to client over WebSocket.
 */
export type ServerMessage =
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
      tool: 'load_skill' | 'load_tools'
      label: string
    }
