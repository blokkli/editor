import type { MutationResponseLike } from '#blokkli/editor/adapter'

// ============================================================================
// Tool Definitions
// ============================================================================

/**
 * Tool to rewrite text content of an editable field.
 */
export type RewriteTextTool = {
  name: 'rewrite_text'
  params: {
    /** Block UUID */
    uuid: string
    /** Field name to update */
    fieldName: string
    /** New text value */
    value: string
  }
}

/**
 * Tool to add a new block.
 */
export type AddBlockTool = {
  name: 'add_block'
  params: {
    /** Temporary ID for referencing in subsequent calls */
    tempId: string
    /** Block bundle type */
    bundle: string
    /** Host entity UUID */
    hostUuid: string
    /** Host field name */
    hostFieldName: string
    /** UUID of block to insert after, null for beginning */
    afterUuid: string | null
    /** Initial field values */
    fields: Record<string, string>
  }
}

/**
 * Tool to delete a block.
 */
export type DeleteBlockTool = {
  name: 'delete_block'
  params: {
    /** Block UUID to delete */
    uuid: string
  }
}

/**
 * Tool to move a block to a new position.
 */
export type MoveBlockTool = {
  name: 'move_block'
  params: {
    /** Block UUID to move */
    uuid: string
    /** Target host entity UUID */
    hostUuid: string
    /** Target host field name */
    hostFieldName: string
    /** UUID of block to insert after, null for beginning */
    afterUuid: string | null
  }
}

/**
 * Union of all available rewrite tools.
 */
export type RewriteTool =
  | RewriteTextTool
  | AddBlockTool
  | DeleteBlockTool
  | MoveBlockTool

/**
 * A pending tool call with acceptance state.
 */
export type PendingToolCall = {
  /** Unique ID for this tool call */
  id: string
  /** The tool being called */
  tool: RewriteTool
  /** Whether user has accepted this tool call */
  accepted: boolean
  /** For add_block: the phantom block UUID */
  phantomUuid?: string
}

// ============================================================================
// Streaming Chunks
// ============================================================================

/**
 * Chunk for text rewrite updates (legacy format for backward compatibility).
 */
export type RewriteTextChunk = {
  type: 'text_update'
  /** Block UUID being updated */
  uuid: string
  /** Field name being updated */
  fieldName: string
  /** Current accumulated text value */
  value: string
  /** Whether this field is complete */
  done: boolean
}

/**
 * Chunk for a complete tool call.
 */
export type ToolCallChunk = {
  type: 'tool_call'
  /** Unique ID for this tool call */
  id: string
  /** The tool being called */
  tool: RewriteTool
}

/**
 * Chunk for streaming tool call argument updates.
 */
export type ToolCallDeltaChunk = {
  type: 'tool_call_delta'
  /** ID of the tool call being updated */
  id: string
  /** Delta to append to accumulated arguments */
  delta: string
}

/**
 * Chunk for assistant text/thinking.
 */
export type AssistantTextChunk = {
  type: 'assistant_text'
  /** Text content */
  content: string
}

/**
 * Chunk received during streaming rewrite.
 * Supports both legacy text-only format and new tool-based format.
 */
export type RewriteChunk =
  | RewriteTextChunk
  | ToolCallChunk
  | ToolCallDeltaChunk
  | AssistantTextChunk
  // Legacy format for backward compatibility
  | {
      /** Block UUID being updated */
      uuid: string
      /** Field name being updated */
      fieldName: string
      /** Current accumulated text value */
      value: string
      /** Whether this field is complete */
      done: boolean
    }

/**
 * Callback for streaming chunks.
 */
export type RewriteStreamCallback = (chunk: RewriteChunk) => void

/**
 * Information about an editable field to rewrite.
 */
export type RewriteFieldInfo = {
  /** Block UUID */
  uuid: string
  /** Field name (e.g., 'field_title', 'field_body') */
  fieldName: string
  /** Current/original value of the field */
  currentValue: string
  /** Field type: 'plain' for text, 'markup' for HTML */
  type: 'plain' | 'markup'
  /** Previous rewrite attempt (for regeneration) */
  previousAttempt?: string
}

/**
 * An accepted text value to display in the chat.
 */
export type RewriteAcceptedText = {
  /** The accepted text value (plain text, HTML stripped) */
  text: string
}

/**
 * A single message in the rewrite conversation history.
 */
export type RewriteMessage = {
  /** Role of the message sender */
  role: 'user' | 'assistant'
  /** The message content (prompt for user, summary for assistant) */
  content: string
  /** For assistant messages: accepted texts to display */
  acceptedTexts?: RewriteAcceptedText[]
}

/**
 * Context field for regeneration - provides accepted values as context.
 */
export type RewriteContextField = {
  /** Block UUID */
  uuid: string
  /** Field name */
  fieldName: string
  /** Original value before any rewrites */
  originalValue: string
  /** The accepted rewritten value */
  acceptedValue: string
  /** Field type */
  type: 'plain' | 'markup'
}

// ============================================================================
// Context Types
// ============================================================================

/**
 * Block context information for the AI.
 */
export type RewriteBlockContext = {
  /** Block UUID */
  uuid: string
  /** Block bundle type */
  bundle: string
  /** Block's editable fields with current values */
  fields: Record<string, string>
  /** Host information for positioning */
  host?: {
    uuid: string
    fieldName: string
  }
  /** UUID of block this comes after, null if first */
  afterUuid?: string | null
}

/**
 * Context provided to the AI for rewrite operations.
 */
export type RewriteContext = {
  /** Blocks to operate on (initially: selected blocks) */
  blocks: RewriteBlockContext[]
  /** Available block bundles that can be added */
  availableBundles?: Array<{
    bundle: string
    label: string
    fields: string[]
  }>
}

/**
 * Request to rewrite selected blocks.
 */
export type AdapterRewriteRequest = {
  /** All editable fields to rewrite, with their current values */
  fields: RewriteFieldInfo[]
  /** User prompt/instructions */
  prompt: string
  /** Full conversation history for context */
  history?: RewriteMessage[]
  /** Fields with accepted values (not to regenerate, but for context) */
  context?: RewriteContextField[]
  /** Block context for tool-based operations */
  blockContext?: RewriteContext
  /** Whether to use tool-based mode */
  useTools?: boolean
}

/**
 * Final result after streaming completes.
 */
export type RewriteResult<T> = {
  success: boolean
  /** Final field values by uuid.fieldName */
  values: Record<string, Record<string, string>>
  /** Optional new state if adapter wants to provide it */
  state?: T
  errors?: string[]
}

/**
 * Request to apply the rewritten values.
 */
export type AdapterApplyRewriteRequest = {
  /** Field values by uuid -> fieldName -> value */
  values: Record<string, Record<string, string>>
  /** Tool calls to execute (for tool-based mode) */
  toolCalls?: RewriteTool[]
}

declare module '#blokkli/editor/adapter' {
  interface AdapterExtensionMethods<T> {
    /**
     * Stream rewrite LLM response for selected blocks.
     *
     * The adapter receives all editable fields with their current values
     * and should stream back chunks as the LLM generates new content.
     *
     * @param request - Contains fields array and user prompt
     * @param onChunk - Callback to emit chunks as they arrive
     * @param signal - Optional AbortSignal to cancel the stream
     * @returns Final result with all field values
     */
    streamRewrite?: (
      request: AdapterRewriteRequest,
      onChunk: RewriteStreamCallback,
      signal?: AbortSignal,
    ) => Promise<RewriteResult<T>>

    /**
     * Persist rewritten values after user accepts.
     *
     * Called when the user accepts the rewritten content.
     * The adapter should persist the values to the backend.
     *
     * @param request - Contains the final field values to persist
     * @returns Mutation response with updated state
     */
    applyRewrite?: (
      request: AdapterApplyRewriteRequest,
    ) => Promise<MutationResponseLike<T>>
  }
}
