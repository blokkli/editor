<template>
  <PluginSidebar
    id="agent"
    :title="$t('aiAgent', 'AI Agent')"
    :tour-text="
      $t('aiAgentTourText', 'Chat with an AI assistant to edit page content.')
    "
    icon="stars"
    weight="-10"
  >
    <AgentPanel
      v-if="isConnected || DEBUG_STYLING"
      :debug-styling="DEBUG_STYLING"
      :history="conversation"
      :active-item="activeItem"
      :is-processing="isProcessing"
      :is-thinking="isThinking"
      :pending-mutation="pendingMutation"
      :pending-tool-call="pendingToolCall"
      :auto-approve="autoApprove"
      @send-prompt="onSendPrompt"
      @approve="onApprove"
      @reject="onReject"
      @always-approve="onAlwaysApprove"
      @cancel="onCancel"
      @debug="onDebug"
      @tool-component-done="onToolComponentDone"
    />
    <div v-else class="bk-agent-connecting">
      <Icon name="loader" />
      <span>{{ $t('aiAgentConnecting', 'Connecting...') }}</span>
    </div>

    <template v-if="pendingMutation || pendingToolCall" #badge>
      <div class="bk-sidebar-badge bk-is-yellow">1</div>
    </template>
  </PluginSidebar>

  <Teleport :to="ui.mainLayoutElement.value">
    <BlokkliTransition name="slide-up">
      <DialogModal
        v-if="showTranscript"
        id="agent-transcript"
        title="Agent Transcript"
        :width="900"
        hide-buttons
        full-screen
        @cancel="showTranscript = false"
      >
        <pre class="bk-agent-transcript">{{ transcriptContent }}</pre>
      </DialogModal>
    </BlokkliTransition>
  </Teleport>
</template>

<script lang="ts" setup>
import {
  ref,
  watch,
  useBlokkli,
  defineBlokkliFeature,
  onMounted,
  onBeforeUnmount,
  provide,
} from '#imports'
import { PluginSidebar } from '#blokkli/editor/plugins'
import {
  Icon,
  DialogModal,
  BlokkliTransition,
} from '#blokkli/editor/components'
import { useDialog } from '#blokkli/editor/composables'
import { useAgentWebSocket } from '#blokkli/agent/app/composables'
import AgentPanel from './Panel/index.vue'
import type {
  ConversationItem,
  ActiveItem,
  MutationAction,
  McpToolDefinition,
} from '#blokkli/agent/app/types'
import type {
  ServerMessage,
  PageContext,
  BlockBundle,
} from '#blokkli/agent/shared/types'
import {
  createToolMap,
  executeTool,
  getToolCategory,
  getToolsForServer,
  getToolDefinition,
  isMutationAction,
  isQueryResult,
  isToolError,
  resolveTools,
} from '#blokkli/agent/app/helpers'
import { itemEntityType } from '#blokkli-build/config'
import { mcpTools } from '#blokkli-build/mcp-tools-client'

const DEBUG_STYLING = false

let toolMap: Record<string, McpToolDefinition> = {}

const { adapter } = defineBlokkliFeature({
  id: 'agent',
  icon: 'stars',
  label: 'AI Agent',
  description: 'Chat with an AI assistant to edit page content.',
  requiredAdapterMethods: [
    'updateFieldValue',
    'addNewBlock',
    'deleteBlocks',
    'moveMultipleBlocks',
  ],
})

const app = useBlokkli()
const { $t, state, selection, ui, context } = app

// Processing state
const isProcessing = ref(false)
const isThinking = ref(false)

// Agent state - flat conversation model
// conversation: History of finalized items (items are never modified after being pushed)
// activeItem: Single item being built (streaming text or pending tool)
const conversation = ref<ConversationItem[]>([])
const activeItem = ref<ActiveItem | null>(null)

// Mutation approval state
const autoApprove = ref(false)
const pendingMutation = ref<{
  action: MutationAction
  resolve: (approved: boolean) => void
} | null>(null)

// Interactive tool component state - only simple serializable data in the ref
type PendingToolCall = {
  toolName: string
  params: Record<string, unknown>
}
const pendingToolCall = ref<PendingToolCall | null>(null)

// Store resolve function separately (not reactive) to avoid storing functions in refs
let pendingToolCallResolve: ((result: unknown) => void) | null = null

// Disable editing while agent is processing
watch(isProcessing, (processing) => {
  if (processing) {
    ui.setTransform($t('aiAgent', 'AI Agent'))
  } else {
    ui.setTransform(null)
  }
})

// Transcript dialog state
const transcriptContent = ref('')
const showTranscript = useDialog('agent-transcript', 'center')

// ============================================================================
// WebSocket Connection
// ============================================================================

const { isConnected, connect, disconnect, send } = useAgentWebSocket({
  onMessage: handleServerMessage,
  onConnect: async () => {
    const ctx = createToolContext()
    const resolved = await resolveTools(mcpTools, ctx)
    toolMap = createToolMap(resolved)
    send({
      type: 'init',
      tools: getToolsForServer(resolved, state.editMode.value, adapter),
      pageContext: buildPageContext(),
    })
  },
  onDisconnect: () => {
    isProcessing.value = false
  },
})

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

// ============================================================================
// Page Context Builder
// ============================================================================

/**
 * Build page context from app state and types for the AI agent.
 * This provides the agent with knowledge of the page and available block types.
 */
function buildPageContext(): PageContext {
  const { types, definitions } = app
  const bundles: BlockBundle[] = []

  for (const bundle of types.generallyAvailableBundles) {
    const contentFields = [
      ...types.editableFieldConfig
        .forEntityTypeAndBundle(itemEntityType, bundle.id)
        .filter((f) => f.type !== 'table')
        .map((f) => ({
          name: f.name,
          label: f.label,
          type: (f.type === 'frame' || f.type === 'markup'
            ? 'markup'
            : 'plain') as 'plain' | 'markup',
        })),
      ...types.droppableFieldConfig
        .forEntityTypeAndBundle(itemEntityType, bundle.id)
        .map((f) => ({
          name: f.name,
          label: f.label,
          type: f.type as 'reference' | 'link',
          allowed: f.allowed,
        })),
    ]

    const blockFields = types.fieldConfig
      .forEntityTypeAndBundle(itemEntityType, bundle.id)
      .map((f) => ({
        name: f.name,
        label: f.label,
        allowedBundles: f.allowedBundles,
        cardinality: f.cardinality,
      }))

    bundles.push({
      id: bundle.id,
      label: bundle.label,
      description: bundle.description,
      contentFields,
      blockFields,
    })
  }

  const fragments = definitions.fragmentDefinitions.value.map((f) => ({
    name: f.name,
    label: f.label,
    description: f.description,
  }))

  return {
    title: state.entity.value.label || '',
    entityType: context.value.entityType,
    entityUuid: context.value.entityUuid,
    entityBundle: context.value.entityBundle,
    bundleLabel: state.entity.value.bundleLabel || '',
    itemEntityType,
    bundles,
    ownerName: state.owner.value?.name,
    interfaceLanguage: ui.interfaceLanguage.value,
    entityLanguage: context.value.language,
    isPublished: state.entity.value.status,
    editMode: state.editMode.value,
    fragments,
  }
}

// ============================================================================
// Server Message Handling
// ============================================================================

/**
 * Finalize the current active item by pushing it to conversation history.
 */
function finalizeActiveItem() {
  const item = activeItem.value
  if (!item) return

  if (item.type === 'assistant' && item.content) {
    conversation.value.push({
      type: 'assistant',
      id: item.id,
      content: item.content,
      timestamp: item.timestamp,
    })
  }
  // Tool items are finalized separately in handleToolCall

  activeItem.value = null
}

/**
 * Handle streaming text content.
 * Creates or updates the active assistant item.
 */
function handleTextContent(content: string) {
  if (activeItem.value?.type === 'assistant') {
    // Update existing assistant item (immutable update for reactivity)
    activeItem.value = {
      ...activeItem.value,
      content: activeItem.value.content + content,
    }
  } else {
    // Create new assistant item
    activeItem.value = {
      type: 'assistant',
      id: generateId(),
      content,
      timestamp: Date.now(),
    }
  }
}

function handleServerMessage(data: ServerMessage) {
  switch (data.type) {
    case 'thinking':
      isThinking.value = true
      break

    case 'text':
      // Add complete text block (non-streaming fallback)
      isThinking.value = false
      handleTextContent(data.content)
      break

    case 'text_delta':
      // Stream text chunks as they arrive
      isThinking.value = false
      handleTextContent(data.content)
      break

    case 'tool_call':
      // Finalize any active assistant message before tool call
      finalizeActiveItem()
      handleToolCall(data.callId, data.tool, data.params)
      break

    case 'done':
      // Finalize active item and end processing
      finalizeActiveItem()
      isThinking.value = false
      isProcessing.value = false

      // Add final message if provided and not duplicate
      if (data.message) {
        const lastItem = conversation.value[conversation.value.length - 1]
        const isDuplicate =
          lastItem?.type === 'assistant' && lastItem.content === data.message
        if (!isDuplicate) {
          conversation.value.push({
            type: 'assistant',
            id: generateId(),
            content: data.message,
            timestamp: Date.now(),
          })
        }
      }
      break

    case 'error':
      finalizeActiveItem()
      isThinking.value = false
      isProcessing.value = false
      conversation.value.push({
        type: 'assistant',
        id: generateId(),
        content: `Error: ${data.message}`,
        timestamp: Date.now(),
      })
      break

    case 'transcript':
      transcriptContent.value = data.content
      showTranscript.value = true
      break
  }
}

// ============================================================================
// Tool Call Handling
// ============================================================================

async function handleToolCall(
  callId: string,
  tool: string,
  params: Record<string, unknown>,
) {
  // Get tool definition for initial label
  const toolDef = getToolDefinition(toolMap, tool)
  const initialLabel = toolDef.label($t)
  const toolId = generateId()
  const timestamp = Date.now()

  // Track current label for updates during execution
  let currentLabel = initialLabel

  // Set active item to pending tool
  activeItem.value = {
    type: 'tool',
    id: toolId,
    callId,
    tool,
    label: initialLabel,
    timestamp,
  }

  try {
    const result = await executeToolLocally(tool, params, (label) => {
      currentLabel = label
      // Update active item label (immutable update for reactivity)
      if (
        activeItem.value?.type === 'tool' &&
        activeItem.value.callId === callId
      ) {
        activeItem.value = { ...activeItem.value, label }
      }
    })

    // Check if the result is an error
    if (isToolError(result)) {
      // Finalize tool as error in conversation history
      conversation.value.push({
        type: 'tool',
        id: toolId,
        callId,
        tool,
        label: currentLabel,
        status: 'error',
        timestamp,
      })
      activeItem.value = null

      // Send error back to server
      send({
        type: 'tool_result',
        callId,
        result: null,
        error: result.error,
      })
    } else {
      // Finalize tool as success in conversation history
      conversation.value.push({
        type: 'tool',
        id: toolId,
        callId,
        tool,
        label: currentLabel,
        status: 'success',
        timestamp,
      })
      activeItem.value = null

      // Send result back to server
      send({
        type: 'tool_result',
        callId,
        result,
      })
    }
  } catch (error) {
    // Finalize tool as error in conversation history
    conversation.value.push({
      type: 'tool',
      id: toolId,
      callId,
      tool,
      label: currentLabel,
      status: 'error',
      timestamp,
    })
    activeItem.value = null

    // Send error back to server
    send({
      type: 'tool_result',
      callId,
      result: null,
      error: (error as Error).message,
    })
  }
}

// ============================================================================
// Tool Execution
// ============================================================================

/**
 * Create the tool context for executing tools.
 */
function createToolContext() {
  return {
    app,
    itemEntityType,
    adapter,
  }
}

/**
 * Wait for an interactive tool component to emit its result.
 * The component handles all user interaction, applies changes, and emits the final result.
 */
function waitForToolComponent(
  toolName: string,
  params: Record<string, unknown>,
): Promise<unknown> {
  return new Promise((resolve) => {
    pendingToolCall.value = { toolName, params }
    pendingToolCallResolve = resolve
  })
}

/**
 * Execute a tool locally.
 * - Tools with component: render component, wait for result
 * - Query tools: return result immediately
 * - Mutation tools: wait for user approval, then return formatted result
 */
async function executeToolLocally(
  toolName: string,
  params: Record<string, unknown>,
  setLabel?: (label: string) => void,
): Promise<unknown> {
  const toolContext = createToolContext()
  const toolDef = getToolDefinition(toolMap, toolName)

  // If tool has an interactive component, render it and wait for result
  if (toolDef.component) {
    // Execute the tool first to get validated params/prepare data for the component
    const preparedParams = await executeTool(
      toolMap,
      toolName,
      toolContext,
      params,
    )

    // Check if it's an error
    if (
      typeof preparedParams === 'object' &&
      preparedParams !== null &&
      'error' in preparedParams
    ) {
      return preparedParams
    }

    // Wait for the component to emit its result
    const result = await waitForToolComponent(
      toolDef.name,
      preparedParams as Record<string, unknown>,
    )

    // If the component result includes a label, use it for display
    if (
      setLabel &&
      typeof result === 'object' &&
      result !== null &&
      'label' in result
    ) {
      setLabel((result as { label: string }).label)
    }

    // If the component result includes a userMessage, add it to conversation
    if (
      typeof result === 'object' &&
      result !== null &&
      'userMessage' in result
    ) {
      const userMsg = (result as { userMessage?: string }).userMessage
      if (userMsg) {
        conversation.value.push({
          type: 'user',
          id: generateId(),
          content: userMsg,
          timestamp: Date.now(),
        })
      }
    }

    return result
  }

  const category = getToolCategory(toolMap, toolName)
  const result = await executeTool(toolMap, toolName, toolContext, params)

  // Query tools return QueryResult with label and result
  if (category === 'query') {
    if (isQueryResult(result)) {
      if (setLabel) {
        setLabel(result.label)
      }
      // Select and scroll to affected blocks if specified
      if (result.affectedUuids?.length) {
        app.eventBus.emit('select', result.affectedUuids)
        app.eventBus.emit('scrollSelectionIntoView', {})
      }
      return result.result // Send only the result data to LLM
    }
    // Error case or unexpected result shape
    return result
  }

  // Check if it's an error from the mutation tool
  if (typeof result === 'object' && result !== null && 'error' in result) {
    return result
  }

  // Must be a MutationAction
  if (!isMutationAction(result)) {
    return { error: 'Invalid mutation tool result' }
  }

  const action = result

  // Set the label for display in the conversation
  if (setLabel) {
    setLabel(action.label)
  }

  /**
   * Apply mutation and handle post-apply actions like selecting affected blocks.
   * Returns the new UUIDs (blocks created by this mutation).
   */
  async function applyMutation(): Promise<string[]> {
    // Capture UUIDs before mutation to detect newly created blocks
    const uuidsBefore = state.getAllUuids()

    await state.mutateWithLoadingState(() => action.apply(adapter))

    // Find newly created UUIDs (blocks that exist now but didn't before)
    const newUuids = action.affectedUuids?.length
      ? action.affectedUuids
      : state.getAllUuids().filter((uuid) => !uuidsBefore.includes(uuid))

    if (newUuids.length) {
      app.eventBus.emit('select', newUuids)
      app.eventBus.emit('scrollSelectionIntoView', {})
    }

    return newUuids
  }

  // If auto-approve is enabled, execute immediately
  if (autoApprove.value) {
    const newUuids = await applyMutation()
    return {
      success: true,
      historyIndex: state.currentMutationIndex.value,
      newUuids: newUuids.length ? newUuids : undefined,
      ...action.result,
    }
  }

  // Wait for user approval
  const approved = await waitForApproval(action)

  if (approved) {
    const newUuids = await applyMutation()
    return {
      success: true,
      historyIndex: state.currentMutationIndex.value,
      newUuids: newUuids.length ? newUuids : undefined,
      ...action.result,
    }
  } else {
    // User rejected - revert if needed
    if (action.revert) {
      action.revert()
    }
    return { success: false, rejected: true }
  }
}

/**
 * Wait for user to approve or reject a mutation action.
 * Returns a promise that resolves to true (approved) or false (rejected).
 */
function waitForApproval(action: MutationAction): Promise<boolean> {
  return new Promise((resolve) => {
    pendingMutation.value = { action, resolve }
  })
}

// ============================================================================
// User Actions
// ============================================================================

function onSendPrompt(prompt: string) {
  if (!prompt.trim() || isProcessing.value) return

  isProcessing.value = true

  // Add user message to conversation
  conversation.value.push({
    type: 'user',
    id: generateId(),
    content: prompt,
    timestamp: Date.now(),
  })

  // Send to server with selected blocks
  send({
    type: 'start',
    prompt,
    selectedUuids: selection.uuids.value.length
      ? [...selection.uuids.value]
      : undefined,
  })
}

/**
 * Approve the pending mutation.
 */
function onApprove() {
  if (pendingMutation.value) {
    pendingMutation.value.resolve(true)
    pendingMutation.value = null
  }
}

/**
 * Reject the pending mutation.
 */
function onReject() {
  if (pendingMutation.value) {
    pendingMutation.value.resolve(false)
    pendingMutation.value = null
  }
}

/**
 * Enable auto-approve and approve the current mutation.
 */
function onAlwaysApprove() {
  autoApprove.value = true
  onApprove()
}

function onCancel() {
  // Reject any pending mutation
  if (pendingMutation.value) {
    pendingMutation.value.resolve(false)
    pendingMutation.value = null
  }
  // Cancel any pending tool component
  if (pendingToolCallResolve) {
    pendingToolCallResolve({ cancelled: true })
    pendingToolCallResolve = null
  }
  pendingToolCall.value = null
  activeItem.value = null
  send({ type: 'cancel' })
  isProcessing.value = false
}

/**
 * Handle result from an interactive tool component.
 */
function onToolComponentDone(result: unknown) {
  if (pendingToolCallResolve) {
    pendingToolCallResolve(result)
    pendingToolCallResolve = null
  }
  pendingToolCall.value = null
}

function onDebug() {
  send({ type: 'get_transcript' })
}

// ============================================================================
// Lifecycle
// ============================================================================

onMounted(() => {
  if (!DEBUG_STYLING) {
    connect()
  }
})

onBeforeUnmount(() => {
  // Re-enable editing
  ui.setTransform(null)

  // Reject any pending mutation before unmounting
  if (pendingMutation.value) {
    if (pendingMutation.value.action.revert) {
      pendingMutation.value.action.revert()
    }
    pendingMutation.value.resolve(false)
    pendingMutation.value = null
  }
  // Cancel any pending tool component
  if (pendingToolCallResolve) {
    pendingToolCallResolve({ cancelled: true })
    pendingToolCallResolve = null
  }
  pendingToolCall.value = null
  disconnect()
})
</script>

<script lang="ts">
export default {
  name: 'Agent',
}
</script>
