// ============================================================================
// WebSocket Protocol Messages
// ============================================================================

/**
 * Messages sent from client to server over WebSocket.
 */
export type ClientMessage =
  | { type: 'start'; prompt: string; selectedUuids?: string[] }
  | { type: 'tool_result'; callId: string; result: unknown; error?: string }
  | { type: 'cancel' }
  | { type: 'accept'; createdBlocks?: Record<string, string> }
  | { type: 'reject' }

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

// ============================================================================
// Tool Definitions - Query Tools (Read-only)
// ============================================================================

/**
 * Result from get_block_info tool.
 */
export type BlockInfoResult = {
  uuid: string
  bundle: string
  options: Record<string, unknown>
  parentEntityType: string | null
  parentUuid: string | null
  parentFieldName: string | null
}

/**
 * Result from get_editable_fields tool.
 */
export type EditableFieldResult = {
  uuid: string
  bundle: string
  fieldName: string
  fieldType: 'plain' | 'markup'
  currentValue: string
}

/**
 * Result from get_children tool.
 */
export type ChildBlockResult = {
  uuid: string
  bundle: string
  index: number
}

/**
 * Result from get_block_fields tool.
 */
export type BlockFieldResult = {
  name: string
  allowedBundles: string[]
  currentCount: number
}

/**
 * Result from get_page_structure tool.
 */
export type PageStructureResult = {
  entityUuid: string
  entityType: string
  entityBundle: string
  fields: Array<{
    name: string
    blocks: Array<{
      uuid: string
      bundle: string
      children?: PageStructureResult['fields']
    }>
  }>
}

/**
 * Result from get_available_bundles tool.
 */
export type AvailableBundleResult = {
  bundle: string
  label: string
  editableFields: string[]
}

/**
 * A block in the visible blocks tree.
 */
export type VisibleBlock = {
  uuid: string
  bundle: string
  /** Percentage of block area visible in viewport (0-100) */
  visibilityPercent: number
  /** Child blocks organized by field name */
  children?: Record<string, VisibleBlock[]>
}

/**
 * Result from get_visible_blocks tool.
 */
export type VisibleBlocksResult = {
  /** Root-level blocks currently visible in the viewport */
  blocks: VisibleBlock[]
}

// ============================================================================
// Tool Definitions - Mutation Tools
// ============================================================================

/**
 * Tool to rewrite text content of an editable field.
 */
export type RewriteTextTool = {
  name: 'rewrite_text'
  params: {
    uuid: string
    fieldName: string
    value: string
  }
}

/**
 * Tool to add a new block.
 */
export type AddBlockTool = {
  name: 'add_block'
  params: {
    tempId: string
    bundle: string
    hostUuid: string
    hostFieldName: string
    afterUuid: string | null
    fields: Record<string, string>
  }
}

/**
 * Tool to delete a block.
 */
export type DeleteBlockTool = {
  name: 'delete_block'
  params: {
    uuid: string
  }
}

/**
 * Tool to move a block to a new position.
 */
export type MoveBlockTool = {
  name: 'move_block'
  params: {
    uuid: string
    hostUuid: string
    hostFieldName: string
    afterUuid: string | null
  }
}

/**
 * Union of all agent tools.
 */
export type AgentTool =
  | RewriteTextTool
  | AddBlockTool
  | DeleteBlockTool
  | MoveBlockTool

// ============================================================================
// Agent State Types
// ============================================================================

/**
 * A pending change from an agent tool call.
 */
export type PendingChange =
  | {
      type: 'rewrite'
      uuid: string
      fieldName: string
      originalValue: string
      newValue: string
    }
  | {
      type: 'add'
      /** The UUID for the new block - used for both phantom preview and final creation */
      blockUuid: string
      bundle: string
      hostEntityType: string
      hostUuid: string
      hostFieldName: string
      afterUuid: string | null
      fields: Record<string, string>
    }
  | {
      type: 'delete'
      uuid: string
    }
  | {
      type: 'move'
      uuid: string
      originalHostEntityType: string
      originalHostUuid: string
      originalHostFieldName: string
      originalAfterUuid: string | null
      newHostEntityType: string
      newHostUuid: string
      newHostFieldName: string
      newAfterUuid: string | null
    }

/**
 * A message in the agent conversation.
 */
export type AgentMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  toolCalls?: Array<{
    id: string
    tool: string
    status: 'pending' | 'success' | 'error'
  }>
}

/**
 * Tool call tracking for UI display.
 */
export type ActiveToolCall = {
  id: string
  tool: string
  params: Record<string, unknown>
  status: 'pending' | 'executing' | 'success' | 'error'
  result?: unknown
  error?: string
}

