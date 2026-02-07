import { ref, readonly, watch, type Ref } from '#imports'
import type {
  ConversationItem,
  ActiveItem,
  MutationAction,
  McpToolDefinition,
} from '#blokkli/agent/app/types'
import type {
  ServerMessage,
  ClientMessage,
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
import { mcpTools } from '#blokkli-build/agent-client'
import type { BlokkliApp } from '#blokkli/editor/types/app'
import type { FullBlokkliAdapter } from '#blokkli/editor/adapter'

// ============================================================================
// Types
// ============================================================================

export type PendingMutationState = {
  action: MutationAction
  resolve: (approved: boolean) => void
}

export type PendingToolCall = {
  toolName: string
  params: Record<string, unknown>
}

export type AgentProviderOptions = {
  app: BlokkliApp
  adapter: FullBlokkliAdapter<any>
  itemEntityType: string
}

export type AgentProvider = {
  // Connection state
  isConnected: Readonly<Ref<boolean>>
  isReady: Readonly<Ref<boolean>>
  connect: () => void
  disconnect: () => void

  // Conversation state
  conversation: Ref<ConversationItem[]>
  activeItem: Ref<ActiveItem | null>
  isProcessing: Ref<boolean>
  isThinking: Ref<boolean>

  // Mutation/tool approval state
  autoApprove: Ref<boolean>
  pendingMutation: Ref<PendingMutationState | null>
  pendingToolCall: Ref<PendingToolCall | null>

  // Actions
  sendPrompt: (
    text: string,
    displayPrompt?: string,
    selectedUuids?: string[],
  ) => void
  approve: () => void
  reject: () => void
  setAutoApprove: (value: boolean) => void
  cancel: () => void
  newConversation: () => void
  getTranscript: () => void
  onToolComponentDone: (result: unknown) => void

  // Transcript dialog state
  transcriptContent: Ref<string>
  showTranscript: Ref<boolean>
}

// ============================================================================
// Provider Implementation
// ============================================================================

export function useAgentProvider(options: AgentProviderOptions): AgentProvider {
  const { app, adapter, itemEntityType } = options
  const { $t, state, ui, context } = app

  // WebSocket state
  let ws: WebSocket | null = null
  let reconnectTimeout: number | null = null
  let hasEverConnected = false
  const isConnected = ref(false)
  const isReady = ref(false)
  let pendingPrompt: {
    prompt: string
    displayPrompt?: string
    selectedUuids?: string[]
  } | null = null

  // Tool map (populated on connect)
  let toolMap: Record<string, McpToolDefinition> = {}

  // Processing state
  const isProcessing = ref(false)
  const isThinking = ref(false)

  // Conversation state
  const conversation = ref<ConversationItem[]>([])
  const activeItem = ref<ActiveItem | null>(null)

  // Mutation approval state
  const autoApprove = ref(false)
  const pendingMutation = ref<PendingMutationState | null>(null)

  // Interactive tool component state
  const pendingToolCall = ref<PendingToolCall | null>(null)
  let pendingToolCallResolve: ((result: unknown) => void) | null = null

  // Transcript dialog state
  const transcriptContent = ref('')
  const showTranscript = ref(false)

  // Disable editing while agent is processing
  watch(isProcessing, (processing) => {
    if (processing) {
      ui.setTransform($t('aiAgent', 'AI Agent'))
    } else {
      ui.setTransform(null)
    }
  })

  // ============================================================================
  // WebSocket Connection
  // ============================================================================

  function send(message: ClientMessage) {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message))
    }
  }

  function onWebSocketOpen() {
    isConnected.value = true
    onConnect()
  }

  function onWebSocketClose() {
    isConnected.value = false
    isReady.value = false
    isProcessing.value = false
    // Reconnect after delay
    reconnectTimeout = window.setTimeout(() => {
      if (!isConnected.value) {
        connect()
      }
    }, 3000)
  }

  function onWebSocketError(error: Event) {
    console.error('WebSocket error:', error)
  }

  function onWebSocketMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data) as ServerMessage
      handleServerMessage(data)
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error)
    }
  }

  function connect() {
    // Only connect once - reconnection is handled automatically on close
    if (hasEverConnected) return
    hasEverConnected = true

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${protocol}//${window.location.host}/api/blokkli/agent`

    ws = new WebSocket(url)
    ws.addEventListener('open', onWebSocketOpen)
    ws.addEventListener('close', onWebSocketClose)
    ws.addEventListener('error', onWebSocketError)
    ws.addEventListener('message', onWebSocketMessage)
  }

  function disconnect() {
    if (reconnectTimeout) {
      window.clearTimeout(reconnectTimeout)
      reconnectTimeout = null
    }
    if (ws) {
      ws.removeEventListener('open', onWebSocketOpen)
      ws.removeEventListener('close', onWebSocketClose)
      ws.removeEventListener('error', onWebSocketError)
      ws.removeEventListener('message', onWebSocketMessage)
      ws.close()
      ws = null
    }
    isConnected.value = false
    isReady.value = false

    // Re-enable editing
    ui.setTransform(null)

    // Reject any pending mutation before disconnecting
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
  }

  async function onConnect() {
    const ctx = createToolContext()
    const resolved = await resolveTools(mcpTools, ctx)
    toolMap = createToolMap(resolved)
    send({
      type: 'init',
      tools: getToolsForServer(resolved, state.editMode.value, adapter),
      pageContext: buildPageContext(),
    })
    isReady.value = true

    if (pendingPrompt) {
      const { prompt, displayPrompt, selectedUuids } = pendingPrompt
      pendingPrompt = null
      sendPrompt(prompt, displayPrompt, selectedUuids)
    }
  }

  // ============================================================================
  // Page Context Builder
  // ============================================================================

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

    // Build entity-level content fields (fields on the page entity itself).
    const entityContentFields = [
      ...types.editableFieldConfig
        .forEntityTypeAndBundle(
          context.value.entityType,
          context.value.entityBundle,
        )
        .filter((f) => f.type !== 'table')
        .map((f) => ({
          name: f.name,
          label: f.label,
          type: (f.type === 'frame' || f.type === 'markup'
            ? 'markup'
            : 'plain') as 'plain' | 'markup',
        })),
      ...types.droppableFieldConfig
        .forEntityTypeAndBundle(
          context.value.entityType,
          context.value.entityBundle,
        )
        .map((f) => ({
          name: f.name,
          label: f.label,
          type: f.type as 'reference' | 'link',
          allowed: f.allowed,
        })),
    ]

    const pageContext: PageContext = {
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

    if (entityContentFields.length) {
      pageContext.entityContentFields = entityContentFields
    }

    return pageContext
  }

  // ============================================================================
  // Server Message Handling
  // ============================================================================

  function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  }

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

    activeItem.value = null
  }

  function handleTextContent(content: string) {
    if (activeItem.value?.type === 'assistant') {
      activeItem.value = {
        ...activeItem.value,
        content: activeItem.value.content + content,
      }
    } else {
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
        isThinking.value = false
        handleTextContent(data.content)
        break

      case 'text_delta':
        isThinking.value = false
        handleTextContent(data.content)
        break

      case 'tool_call':
        finalizeActiveItem()
        handleToolCall(data.callId, data.tool, data.params)
        break

      case 'done':
        finalizeActiveItem()
        isThinking.value = false
        isProcessing.value = false

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
        if (data.detail) {
          console.warn(`[blokkli agent] ${data.errorType} error:`, data.detail)
        }
        conversation.value.push({
          type: 'error',
          id: generateId(),
          errorType: data.errorType,
          timestamp: Date.now(),
        })
        break

      case 'server_tool_result':
        finalizeActiveItem()
        conversation.value.push({
          type: 'server_tool',
          id: generateId(),
          tool: data.tool,
          label: data.label,
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
    const toolDef = getToolDefinition(toolMap, tool)
    const initialLabel = toolDef.label($t)
    const toolId = generateId()
    const timestamp = Date.now()

    let currentLabel = initialLabel

    activeItem.value = {
      type: 'tool',
      id: toolId,
      callId,
      tool,
      label: initialLabel,
      status: 'active',
      timestamp,
    }

    try {
      const result = await executeToolLocally(tool, params, (label) => {
        currentLabel = label
        if (
          activeItem.value?.type === 'tool' &&
          activeItem.value.callId === callId
        ) {
          activeItem.value = { ...activeItem.value, label }
        }
      })

      if (isToolError(result)) {
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

        send({
          type: 'tool_result',
          callId,
          result: null,
          error: result.error,
        })
      } else {
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

        send({
          type: 'tool_result',
          callId,
          result,
        })
      }
    } catch (error) {
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

  function createToolContext() {
    return {
      app,
      itemEntityType,
      adapter,
    }
  }

  function waitForToolComponent(
    toolName: string,
    params: Record<string, unknown>,
  ): Promise<unknown> {
    return new Promise((resolve) => {
      pendingToolCall.value = { toolName, params }
      pendingToolCallResolve = resolve
    })
  }

  async function executeToolLocally(
    toolName: string,
    params: Record<string, unknown>,
    setLabel?: (label: string) => void,
  ): Promise<unknown> {
    const toolContext = createToolContext()
    const toolDef = getToolDefinition(toolMap, toolName)

    if (toolDef.component) {
      const preparedParams = await executeTool(
        toolMap,
        toolName,
        toolContext,
        params,
      )

      if (
        typeof preparedParams === 'object' &&
        preparedParams !== null &&
        'error' in preparedParams
      ) {
        return preparedParams
      }

      const result = await waitForToolComponent(
        toolDef.name,
        preparedParams as Record<string, unknown>,
      )

      if (
        setLabel &&
        typeof result === 'object' &&
        result !== null &&
        'label' in result
      ) {
        setLabel((result as { label: string }).label)
      }

      return result
    }

    const category = getToolCategory(toolMap, toolName)
    const result = await executeTool(toolMap, toolName, toolContext, params)

    if (category === 'query') {
      if (isQueryResult(result)) {
        if (setLabel) {
          setLabel(result.label)
        }
        if (result.affectedUuids?.length) {
          app.eventBus.emit('select', result.affectedUuids)
          app.eventBus.emit('scrollSelectionIntoView', {})
        }
        return result.result
      }
      return result
    }

    if (typeof result === 'object' && result !== null && 'error' in result) {
      return result
    }

    if (!isMutationAction(result)) {
      return { error: 'Invalid mutation tool result' }
    }

    const action = result

    if (setLabel) {
      setLabel(action.label)
    }

    async function applyMutation(): Promise<string[]> {
      const uuidsBefore = state.getAllUuids()

      await state.mutateWithLoadingState(() => action.apply(adapter))

      const newUuids = state
        .getAllUuids()
        .filter((uuid) => !uuidsBefore.includes(uuid))

      const selectUuids = newUuids.length
        ? newUuids
        : action.affectedUuids || []
      if (selectUuids.length) {
        app.eventBus.emit('select', selectUuids)
        app.eventBus.emit('scrollSelectionIntoView', {})
      }

      return newUuids
    }

    function buildMutationResult(newUuids: string[]) {
      const newBlocks =
        action.type === 'add' && newUuids.length
          ? newUuids
              .map((uuid) => {
                const block = app.blocks.getBlock(uuid)
                if (!block) return null
                const blockFieldNames = app.types.fieldConfig
                  .forEntityTypeAndBundle(itemEntityType, block.bundle)
                  .map((f) => f.name)
                return {
                  uuid,
                  bundle: block.bundle,
                  ...(blockFieldNames.length
                    ? { blockFields: blockFieldNames }
                    : {}),
                }
              })
              .filter(
                (
                  b,
                ): b is {
                  uuid: string
                  bundle: string
                  blockFields?: string[]
                } => b !== null,
              )
          : undefined

      return {
        success: true,
        historyIndex: state.currentMutationIndex.value,
        newBlocks: newBlocks?.length ? newBlocks : undefined,
        ...action.result,
      }
    }

    if (autoApprove.value || !toolDef.requiresApproval) {
      const newUuids = await applyMutation()
      return buildMutationResult(newUuids)
    }

    const approved = await waitForApproval(action)

    if (approved) {
      const newUuids = await applyMutation()
      return buildMutationResult(newUuids)
    } else {
      if (action.revert) {
        action.revert()
      }
      return { success: false, rejected: true }
    }
  }

  function waitForApproval(action: MutationAction): Promise<boolean> {
    return new Promise((resolve) => {
      pendingMutation.value = { action, resolve }
    })
  }

  // ============================================================================
  // User Actions
  // ============================================================================

  function sendPrompt(
    prompt: string,
    displayPrompt?: string,
    selectedUuids?: string[],
  ) {
    if (!prompt.trim() || isProcessing.value) return

    if (!isReady.value) {
      pendingPrompt = { prompt, displayPrompt, selectedUuids }
      return
    }

    isProcessing.value = true

    conversation.value.push({
      type: 'user',
      id: generateId(),
      content: displayPrompt || prompt,
      timestamp: Date.now(),
    })

    send({
      type: 'start',
      prompt,
      selectedUuids: selectedUuids?.length ? selectedUuids : undefined,
    })
  }

  function approve() {
    if (pendingMutation.value) {
      pendingMutation.value.resolve(true)
      pendingMutation.value = null
    }
  }

  function reject() {
    if (pendingMutation.value) {
      pendingMutation.value.resolve(false)
      pendingMutation.value = null
    }
  }

  function setAutoApprove(value: boolean) {
    autoApprove.value = value
    if (value) {
      approve()
    }
  }

  function cancel() {
    if (pendingMutation.value) {
      pendingMutation.value.resolve(false)
      pendingMutation.value = null
    }
    if (pendingToolCallResolve) {
      pendingToolCallResolve({ cancelled: true })
      pendingToolCallResolve = null
    }
    pendingToolCall.value = null
    activeItem.value = null
    send({ type: 'cancel' })
    isProcessing.value = false

    conversation.value.push({
      type: 'assistant',
      id: generateId(),
      content: $t('aiAgentCancelled', 'Cancelled'),
      timestamp: Date.now(),
    })
  }

  function newConversation() {
    // Cancel any in-progress work
    if (pendingMutation.value) {
      pendingMutation.value.resolve(false)
      pendingMutation.value = null
    }
    if (pendingToolCallResolve) {
      pendingToolCallResolve({ cancelled: true })
      pendingToolCallResolve = null
    }
    pendingToolCall.value = null

    // Clear client state
    conversation.value = []
    activeItem.value = null
    isProcessing.value = false
    isThinking.value = false

    // Tell server to clear conversation
    send({ type: 'new_conversation' })
  }

  function getTranscript() {
    send({ type: 'get_transcript' })
  }

  function onToolComponentDone(result: unknown) {
    if (pendingToolCallResolve) {
      pendingToolCallResolve(result)
      pendingToolCallResolve = null
    }
    pendingToolCall.value = null
  }

  // ============================================================================
  // Return Provider
  // ============================================================================

  return {
    // Connection state
    isConnected: readonly(isConnected),
    isReady: readonly(isReady),
    connect,
    disconnect,

    // Conversation state
    conversation,
    activeItem,
    isProcessing,
    isThinking,

    // Mutation/tool approval state
    autoApprove,
    pendingMutation,
    pendingToolCall,

    // Actions
    sendPrompt,
    approve,
    reject,
    setAutoApprove,
    cancel,
    newConversation,
    getTranscript,
    onToolComponentDone,

    // Transcript dialog state
    transcriptContent,
    showTranscript,
  }
}
