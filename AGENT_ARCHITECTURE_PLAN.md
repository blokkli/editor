# Blokkli AI Agent Architecture Plan

## Overview

Replace the current "ping-pong" rewrite feature with a proper agentic architecture where:
- Claude runs as an autonomous agent with access to tools
- The client acts as an "MCP server" - providing tool implementations
- Bidirectional WebSocket communication enables real-time tool calls
- Conversation state persists across interactions

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           FRONTEND                                   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Agent Provider                            │   │
│  │  - WebSocket connection management                           │   │
│  │  - Tool implementations (query state, apply mutations)       │   │
│  │  - Conversation history                                      │   │
│  │  - Pending changes tracking                                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│                              ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Agent UI (Panel)                          │   │
│  │  - Chat interface                                            │   │
│  │  - Shows tool calls as they happen                           │   │
│  │  - Accept/Cancel pending changes                             │   │
│  │  - Not tied to selection                                     │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           SERVER                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                 WebSocket Handler                            │   │
│  │  routes/api/agent.ts                                         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│                              ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                   Agent Loop                                 │   │
│  │                                                              │   │
│  │  while not done:                                             │   │
│  │    response = claude.messages.create(messages, tools)        │   │
│  │    for tool_use in response:                                 │   │
│  │      send tool_call to client via WebSocket                  │   │
│  │      wait for tool_result from client                        │   │
│  │      append to messages                                      │   │
│  │    if no tool_use: done                                      │   │
│  │                                                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## WebSocket Protocol

### Client → Server Messages

```typescript
// Start a new agent session or continue existing one
type StartMessage = {
  type: 'start'
  prompt: string
  sessionId?: string // If continuing existing session
  selectedUuids?: string[] // Optional hint about what user selected
}

// Response to a tool call
type ToolResultMessage = {
  type: 'tool_result'
  callId: string
  result: unknown
  error?: string
}

// Cancel the current operation
type CancelMessage = {
  type: 'cancel'
}

// Accept all pending changes
type AcceptMessage = {
  type: 'accept'
}

// Reject all pending changes
type RejectMessage = {
  type: 'reject'
}
```

### Server → Client Messages

```typescript
// Agent is thinking/processing
type ThinkingMessage = {
  type: 'thinking'
  content?: string // Optional thinking text
}

// Agent wants to call a tool
type ToolCallMessage = {
  type: 'tool_call'
  callId: string
  tool: string
  params: Record<string, unknown>
}

// Agent finished processing
type DoneMessage = {
  type: 'done'
  message?: string // Summary of what was done
}

// Error occurred
type ErrorMessage = {
  type: 'error'
  message: string
}

// Session info (sent on connect or when session state changes)
type SessionMessage = {
  type: 'session'
  sessionId: string
  history: ConversationMessage[]
}
```

## Tools Available to Agent

### Query Tools (Read-only)

```typescript
// Get information about a block
get_block_info: {
  params: { uuid: string }
  returns: {
    uuid: string
    bundle: string
    options: Record<string, unknown>
    parentUuid: string | null
    parentFieldName: string | null
  }
}

// Get editable text fields for a block (optionally including nested children)
get_editable_fields: {
  params: {
    uuid: string
    includeNested?: boolean // If true, includes all descendant blocks
  }
  returns: Array<{
    uuid: string
    bundle: string
    fieldName: string
    fieldType: 'plain' | 'markup'
    currentValue: string
  }>
}

// Get children of a block in a specific field
get_children: {
  params: {
    uuid: string
    fieldName: string
  }
  returns: Array<{
    uuid: string
    bundle: string
    index: number
  }>
}

// Get fields available on a block (where children can be placed)
get_block_fields: {
  params: { uuid: string }
  returns: Array<{
    name: string
    allowedBundles: string[]
    cardinality: number | 'unlimited'
    currentCount: number
  }>
}

// Get the page structure (all blocks in a tree)
get_page_structure: {
  params: {}
  returns: {
    entityUuid: string
    entityType: string
    entityBundle: string
    fields: Array<{
      name: string
      blocks: BlockTreeNode[]
    }>
  }
}
// where BlockTreeNode = { uuid, bundle, children: { [fieldName]: BlockTreeNode[] } }

// Get available block bundles that can be added
get_available_bundles: {
  params: {
    hostUuid: string
    fieldName: string
  }
  returns: Array<{
    bundle: string
    label: string
    description?: string
    editableFields: string[] // Fields that can be set on creation
  }>
}
```

### Mutation Tools (Write)

```typescript
// Rewrite text in an editable field
rewrite_text: {
  params: {
    uuid: string
    fieldName: string
    value: string
  }
  returns: { success: boolean }
}

// Add a new block
add_block: {
  params: {
    hostUuid: string
    hostFieldName: string
    bundle: string
    afterUuid: string | null // null = insert at beginning
    props: Record<string, string> // Initial field values
  }
  returns: {
    success: boolean
    uuid: string // The new block's UUID (phantom)
  }
}

// Delete a block
delete_block: {
  params: { uuid: string }
  returns: { success: boolean }
}

// Move a block to a new location
move_block: {
  params: {
    uuid: string
    newHostUuid: string
    newHostFieldName: string
    afterUuid: string | null
  }
  returns: { success: boolean }
}
```

## Implementation Plan

### Phase 1: WebSocket Infrastructure

**Files to create/modify:**

1. `playground/server/routes/api/agent.ts` - WebSocket handler
2. `src/runtime/editor/providers/agent.ts` - Agent provider (connection, tool implementations)
3. Enable WebSocket in Nuxt config

**WebSocket Handler (server):**
```typescript
// playground/server/routes/api/agent.ts
export default defineWebSocketHandler({
  open(peer) {
    // Initialize session
  },

  async message(peer, message) {
    const data = JSON.parse(message.text())

    if (data.type === 'start') {
      await runAgentLoop(peer, data)
    } else if (data.type === 'tool_result') {
      // Resolve pending tool call promise
      resolveToolCall(data.callId, data.result)
    } else if (data.type === 'cancel') {
      // Abort current operation
    }
  },

  close(peer) {
    // Cleanup session
  }
})
```

**Agent Loop (server):**
```typescript
async function runAgentLoop(peer: Peer, request: StartMessage) {
  const messages = buildInitialMessages(request)

  while (true) {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: AGENT_SYSTEM_PROMPT,
      messages,
      tools: TOOL_DEFINITIONS,
    })

    // Check for tool use
    const toolUses = response.content.filter(c => c.type === 'tool_use')

    if (toolUses.length === 0) {
      // Agent is done
      peer.send(JSON.stringify({ type: 'done', message: extractTextContent(response) }))
      break
    }

    // Process each tool call
    for (const toolUse of toolUses) {
      // Send tool call to client
      peer.send(JSON.stringify({
        type: 'tool_call',
        callId: toolUse.id,
        tool: toolUse.name,
        params: toolUse.input,
      }))

      // Wait for client response
      const result = await waitForToolResult(toolUse.id)

      // Add to messages
      messages.push({
        role: 'user',
        content: [{
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
        }]
      })
    }

    // Add assistant's response to messages
    messages.push({ role: 'assistant', content: response.content })
  }
}
```

### Phase 2: Client-Side Agent Provider

**File:** `src/runtime/editor/providers/agent.ts`

```typescript
export type AgentProvider = {
  // Connection state
  isConnected: Readonly<Ref<boolean>>
  isProcessing: Readonly<Ref<boolean>>

  // Conversation
  messages: Readonly<Ref<ConversationMessage[]>>
  pendingChanges: Readonly<Ref<PendingChange[]>>

  // Actions
  connect: () => Promise<void>
  disconnect: () => void
  sendPrompt: (prompt: string, selectedUuids?: string[]) => void
  cancel: () => void
  acceptChanges: () => Promise<void>
  rejectChanges: () => void
}
```

**Tool Implementations (client-side):**
```typescript
const toolHandlers: Record<string, (params: any) => unknown> = {
  get_block_info: ({ uuid }) => {
    const block = dom.getBlock(uuid)
    if (!block) return { error: 'Block not found' }
    return {
      uuid: block.uuid,
      bundle: block.bundle,
      // ... gather from state/dom providers
    }
  },

  get_editable_fields: ({ uuid, includeNested }) => {
    // Use directive.getEditablesForBlock() and traverse if includeNested
  },

  rewrite_text: ({ uuid, fieldName, value }) => {
    // Apply to mutatedItemProps for preview
    state.mutatedItemProps[uuid] = {
      ...state.mutatedItemProps[uuid],
      [fieldName]: value
    }
    // Track as pending change
    pendingChanges.push({ type: 'rewrite', uuid, fieldName, value })
    return { success: true }
  },

  add_block: ({ hostUuid, hostFieldName, bundle, afterUuid, props }) => {
    const phantomUuid = generatePhantomUuid()
    state.addPhantomBlock(phantomUuid, {
      bundle,
      host: { uuid: hostUuid, fieldName: hostFieldName },
      afterUuid,
      props,
    })
    pendingChanges.push({ type: 'add', phantomUuid, ... })
    return { success: true, uuid: phantomUuid }
  },

  // ... other handlers
}
```

### Phase 3: UI Components

**New feature:** `src/runtime/editor/features/agent/`

```
features/agent/
├── index.vue           # Feature registration, toolbar button
├── Panel/
│   ├── index.vue       # Main panel component
│   ├── Messages.vue    # Chat message display
│   ├── ToolCall.vue    # Individual tool call display
│   └── PendingChanges.vue # List of pending changes
```

**Key differences from current rewrite:**
- Panel is NOT tied to selection
- Panel can be opened/closed independently
- Conversation persists when panel is closed
- Shows real-time tool calls as they happen
- Shows pending changes that will be applied on "Accept"

### Phase 4: Adapter Integration

The adapter needs methods to actually persist the changes:

```typescript
// New adapter methods
interface BlokkliAdapter {
  // Existing...

  // Apply multiple agent mutations at once
  applyAgentMutations?: (mutations: AgentMutation[]) => Promise<{
    success: boolean
    state?: MutatedState
    errors?: string[]
  }>
}

type AgentMutation =
  | { type: 'rewrite_text', uuid: string, fieldName: string, value: string }
  | { type: 'add_block', hostUuid: string, hostFieldName: string, bundle: string, afterUuid: string | null, props: Record<string, string> }
  | { type: 'delete_block', uuid: string }
  | { type: 'move_block', uuid: string, newHostUuid: string, newHostFieldName: string, afterUuid: string | null }
```

### Phase 5: System Prompt & Tool Definitions

**System Prompt:**
```
You are an AI assistant helping users edit page content in a block-based editor.

You have access to tools to:
- Query the page structure and block information
- Rewrite text content in blocks
- Add new blocks
- Delete blocks
- Move blocks

When the user asks you to do something:
1. First use query tools to understand the current state
2. Then use mutation tools to make the requested changes
3. Be precise - always verify block structure before making changes

The user may provide hints about what they selected, but always verify with query tools.

When rewriting text:
- Preserve HTML structure for 'markup' type fields
- Use plain text for 'plain' type fields

When adding blocks:
- Use get_available_bundles to see what can be added where
- Use get_block_fields to find the correct field name

Always confirm what you've done at the end.
```

## File Changes Summary

### New Files
- `playground/server/routes/api/agent.ts` - WebSocket handler
- `src/runtime/editor/providers/agent.ts` - Agent provider
- `src/runtime/editor/features/agent/index.vue` - Feature registration
- `src/runtime/editor/features/agent/Panel/index.vue` - Main panel
- `src/runtime/editor/features/agent/Panel/Messages.vue` - Chat UI
- `src/runtime/editor/features/agent/Panel/ToolCall.vue` - Tool call display
- `src/runtime/editor/features/agent/Panel/PendingChanges.vue` - Pending changes list
- `src/runtime/editor/types/agent.ts` - Type definitions

### Modified Files
- `playground/nuxt.config.ts` - Enable WebSocket
- `src/runtime/adapter/index.ts` - Add applyAgentMutations method
- `playground/app/blokkli/adapter.ts` or extension - Implement applyAgentMutations
- `playground/app/mock/plugins/mutations/` - Add agent mutation handler

### Files to Remove/Deprecate
- `src/runtime/editor/features/rewrite/` - Replace entirely with agent feature
- `playground/server/api/rewrite/` - No longer needed

## Migration Notes

The old rewrite feature can be removed entirely. The new agent feature provides:
- Everything the old rewrite did (text rewriting)
- Plus: add/delete/move blocks
- Plus: persistent conversation
- Plus: not tied to selection
- Plus: proper context discovery via tools

## Open Questions

1. **Session persistence** - Should sessions persist across page reloads? (Probably not for MVP)
2. **Multiple providers** - How to handle if there are multiple BlokkliProviders on a page?
3. **Undo integration** - Should agent changes create proper undo history entries?
4. **Concurrent edits** - What if user manually edits while agent is working?
