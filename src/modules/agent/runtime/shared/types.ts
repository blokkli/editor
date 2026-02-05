// ============================================================================
// Page Context Types
// ============================================================================

/**
 * Editable field metadata for a block bundle.
 */
export type BlockBundleEditableField = {
  name: string
  label: string
  type: string
}

/**
 * Droppable field metadata for a block bundle.
 */
export type BlockBundleDroppableField = {
  name: string
  label: string
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
  editableFields: BlockBundleEditableField[]
  droppableFields: BlockBundleDroppableField[]
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
  input_schema: object
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
  | { type: 'error'; message: string }
  | { type: 'transcript'; content: string }
