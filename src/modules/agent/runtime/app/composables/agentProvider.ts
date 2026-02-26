import { ref, shallowRef, readonly, reactive, watch, type Ref } from '#imports'
import {
  conversationItemSchema,
  type Attachment,
  type ConversationItem,
  type ActiveItem,
  type MutationAction,
  type McpToolDefinition,
} from '#blokkli/agent/app/types'
import type {
  ServerMessage,
  ClientMessage,
  ClientPlanState,
  ConversationStateSnapshot,
  UsageTurn,
  PageContext,
  BlockBundle,
  Transcript,
} from '#blokkli/agent/shared/types'
import type {
  AgentConversationData,
  AgentConversationSummary,
} from '#blokkli/agent/app/features/agent/types'
import {
  createToolMap,
  executeTool,
  getToolCategory,
  getToolInfoForServer,
  getToolDefinition,
  isMutationAction,
  isQueryResult,
  isToolError,
  resolveTools,
} from '#blokkli/agent/app/helpers'
import { mcpTools } from '#blokkli-build/agent-client'
import type { BlokkliApp } from '#blokkli/editor/types/app'
import type { FullBlokkliAdapter } from '#blokkli/editor/adapter'
import { generateUUID } from '#blokkli/editor/helpers/uuid'
import { itemEntityType } from '#blokkli-build/config'

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
  hasBeenReady: Readonly<Ref<boolean>>
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

  // Plan state
  plan: Ref<ClientPlanState | null>
  approvePlan: () => void
  rejectPlan: () => void

  // Token usage
  usageTurns: Ref<UsageTurn[]>

  // Actions
  sendPrompt: (
    text: string,
    displayPrompt?: string,
    selectedUuids?: string[],
    attachments?: Attachment[],
  ) => void
  retry: () => void
  approve: () => void
  reject: () => void
  setAutoApprove: (value: boolean) => void
  cancel: () => void
  newConversation: () => void
  getTranscript: () => void
  onToolComponentDone: (result: unknown) => void

  // Tool details (ephemeral, in-memory only)
  toolDetails: Map<string, unknown>

  // Transcript dialog state
  transcriptContent: Ref<Transcript | null>
  showTranscript: Ref<boolean>

  // Conversation list
  conversationList: Ref<AgentConversationSummary[]>
  showConversationList: Ref<boolean>
  activeConversationId: Readonly<Ref<string | null>>
  switchConversation: (id: string) => void
  deleteConversation: (id: string) => void
  refreshConversationList: () => Promise<void>

  // Page context (built once during connection)
  pageContext: Ref<PageContext | null>
}

// ============================================================================
// Provider Implementation
// ============================================================================

export default function (
  app: BlokkliApp,
  adapter: FullBlokkliAdapter<any>,
  agentName: string,
): AgentProvider {
  const { $t, state, ui, context } = app

  // WebSocket state
  let ws: WebSocket | null = null
  let reconnectTimeout: number | null = null
  let pingInterval: number | null = null
  let reconnectAttempts = 0
  const MAX_RECONNECT_ATTEMPTS = 10
  const isConnected = ref(false)
  const isReady = ref(false)
  const hasBeenReady = ref(false)
  let pendingPrompt: {
    prompt: string
    displayPrompt?: string
    selectedUuids?: string[]
    attachments?: Attachment[]
  } | null = null
  let pendingInit: {
    toolNames: string[]
    pageContext: PageContext
  } | null = null

  // Tool map (populated on connect)
  let toolMap: Record<string, McpToolDefinition> = {}

  // Page context built during connection, reused by tools.
  const storedPageContext = shallowRef<PageContext | null>(null)

  // Processing state
  const isProcessing = ref(false)
  const isThinking = ref(false)

  // Token usage tracking (one entry per server usage event)
  const usageTurns = ref<UsageTurn[]>([])

  // Conversation state
  const conversation = ref<ConversationItem[]>([])
  const activeItem = ref<ActiveItem | null>(null)

  // Mutation approval state
  const autoApprove = ref(false)
  const pendingMutation = ref<PendingMutationState | null>(null)

  // Interactive tool component state
  const pendingToolCall = ref<PendingToolCall | null>(null)
  let pendingToolCallResolve: ((result: unknown) => void) | null = null

  // Plan state
  const plan = ref<ClientPlanState | null>(null)

  // Transcript dialog state
  const transcriptContent = ref<Transcript | null>(null)
  const showTranscript = ref(false)

  // Conversation list state
  const activeConversationId = ref<string | null>(null)
  const conversationList = ref<AgentConversationSummary[]>([])
  const showConversationList = ref(false)

  // In-memory tool details (ephemeral, cleared on new conversation)
  const toolDetails: Map<string, unknown> = reactive(new Map())

  // ============================================================================
  // Conversation Persistence Helpers
  // ============================================================================

  async function saveCurrentConversation(
    serverState: ConversationStateSnapshot,
  ): Promise<void> {
    if (!adapter.agentConversations) return
    if (!conversation.value.length) return

    // Generate an ID if we don't have one yet
    if (!activeConversationId.value) {
      activeConversationId.value = generateUUID()
    }

    // Compute title from first user message
    const firstUser = conversation.value.find((item) => item.type === 'user')
    const titleText =
      firstUser && 'content' in firstUser ? firstUser.content : ''
    const title =
      titleText.length > 80 ? titleText.slice(0, 80) + '…' : titleText

    try {
      await adapter.agentConversations.upsert({
        uuid: activeConversationId.value,
        title,
        clientState: JSON.stringify({
          conversation: conversation.value.filter(
            (item) => item.type !== 'error',
          ),
          usageTurns: usageTurns.value,
        }),
        serverState: JSON.stringify({
          messages: serverState.messages,
          activatedLazyTools: serverState.activatedLazyTools,
        }),
        hash: serverState.hash,
      })
    } catch (e) {
      console.warn('[blokkli agent] Failed to save conversation:', e)
    }
  }

  type ParsedConversation = {
    conversation: ConversationItem[]
    usageTurns: UsageTurn[]
    serverState: ConversationStateSnapshot
  }

  function parseConversationData(
    data: AgentConversationData,
  ): ParsedConversation | null {
    try {
      const parsed: {
        conversation?: unknown[]
        usageTurns?: UsageTurn[]
      } = JSON.parse(data.clientState)

      if (!parsed.conversation?.length) {
        return null
      }

      const clientConversation: ConversationItem[] = parsed.conversation.map(
        (item) => {
          const result = conversationItemSchema.safeParse(item)
          if (result.success) {
            return result.data
          }
          return {
            type: 'unknown' as const,
            id: generateId(),
            timestamp: Date.now(),
          }
        },
      )

      const serverParsed: {
        messages: ConversationStateSnapshot['messages']
        activatedLazyTools: ConversationStateSnapshot['activatedLazyTools']
      } = JSON.parse(data.serverState)

      if (!serverParsed?.messages?.length) {
        return null
      }

      return {
        conversation: clientConversation,
        usageTurns: parsed.usageTurns ?? [],
        serverState: {
          messages: serverParsed.messages,
          activatedLazyTools: serverParsed.activatedLazyTools,
          hash: data.hash,
        },
      }
    } catch {
      return null
    }
  }

  async function loadConversation(
    uuid: string,
  ): Promise<ParsedConversation | null> {
    if (!adapter.agentConversations) return null

    try {
      const data = await adapter.agentConversations.load(uuid)
      if (!data) return null
      return parseConversationData(data)
    } catch (e) {
      console.warn('[blokkli agent] Failed to load conversation:', e)
      return null
    }
  }

  async function deleteConversation(id: string): Promise<void> {
    if (adapter.agentConversations) {
      try {
        await adapter.agentConversations.delete(id)
      } catch (e) {
        console.warn('[blokkli agent] Failed to delete conversation:', e)
      }
    }

    // If deleting the active conversation, clear UI and tell server
    if (activeConversationId.value === id) {
      activeConversationId.value = null
      conversation.value = []
      activeItem.value = null
      isProcessing.value = false
      isThinking.value = false

      send({ type: 'new_conversation' })
    }

    // Refresh the list
    await refreshConversationList()
  }

  async function switchConversation(id: string): Promise<void> {
    if (isProcessing.value) return

    const loaded = await loadConversation(id)
    if (!loaded) return

    // Restore UI state
    conversation.value = loaded.conversation
    usageTurns.value = loaded.usageTurns
    activeItem.value = null
    activeConversationId.value = id

    // Tell server to restore this conversation's state
    send({ type: 'restore_conversation', state: loaded.serverState })

    // Hide the list
    showConversationList.value = false
  }

  async function refreshConversationList(): Promise<void> {
    if (!adapter.agentConversations) {
      conversationList.value = []
      return
    }

    try {
      const list = await adapter.agentConversations.list()
      conversationList.value = list.sort((a, b) =>
        b.updatedAt.localeCompare(a.updatedAt),
      )
    } catch (e) {
      console.warn('[blokkli agent] Failed to list conversations:', e)
      conversationList.value = []
    }
  }

  // Disable editing while agent is processing
  watch(isProcessing, (processing) => {
    if (processing) {
      ui.setTransform(agentName)
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
    reconnectAttempts = 0
    pingInterval = window.setInterval(() => {
      send({ type: 'ping' })
    }, 30_000)
    onConnect()
  }

  function onWebSocketClose() {
    if (pingInterval) {
      window.clearInterval(pingInterval)
      pingInterval = null
    }
    isConnected.value = false
    isReady.value = false
    isProcessing.value = false

    reconnectAttempts++
    if (reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
      conversation.value.push({
        type: 'error',
        id: generateId(),
        errorType: 'connection',
        timestamp: Date.now(),
      })
      return
    }

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
    // Already connected or connecting — don't create a duplicate socket
    if (
      ws &&
      (ws.readyState === WebSocket.OPEN ||
        ws.readyState === WebSocket.CONNECTING)
    ) {
      return
    }

    // Clean up dead socket if any
    if (ws) {
      ws.removeEventListener('open', onWebSocketOpen)
      ws.removeEventListener('close', onWebSocketClose)
      ws.removeEventListener('error', onWebSocketError)
      ws.removeEventListener('message', onWebSocketMessage)
      ws = null
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${protocol}//${window.location.host}/api/blokkli/agent`

    ws = new WebSocket(url)
    ws.addEventListener('open', onWebSocketOpen)
    ws.addEventListener('close', onWebSocketClose)
    ws.addEventListener('error', onWebSocketError)
    ws.addEventListener('message', onWebSocketMessage)
  }

  function disconnect() {
    if (pingInterval) {
      window.clearInterval(pingInterval)
      pingInterval = null
    }
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

    const toolNames = getToolInfoForServer(
      resolved,
      state.editMode.value,
      adapter,
    )

    // Fetch content search tabs if the adapter supports it
    let contentSearchTabs: PageContext['contentSearchTabs']
    if (adapter.getContentSearchTabs) {
      try {
        contentSearchTabs = await adapter.getContentSearchTabs()
      } catch (e) {
        console.warn('[blokkli agent] Failed to fetch content search tabs:', e)
      }
    }

    if (adapter.getAgentAuthToken) {
      try {
        const authToken = await adapter.getAgentAuthToken()
        if (!authToken) {
          conversation.value.push({
            type: 'error',
            id: generateId(),
            errorType: 'unauthorized',
            timestamp: Date.now(),
          })
          disconnect()
          return
        }
        // Build pageContext BEFORE sending authenticate, so that
        // pendingInit is ready when the 'authenticated' response arrives.
        const pageContext = await buildPageContext(contentSearchTabs)
        storedPageContext.value = pageContext
        pendingInit = { toolNames, pageContext }
        send({ type: 'authenticate', authToken })
        return
      } catch (e) {
        console.error('Failed to obtain agent auth token:', e)
      }
    }

    const pageContext = await buildPageContext(contentSearchTabs)
    storedPageContext.value = pageContext
    sendInit(toolNames, pageContext)
  }

  async function sendInit(toolNames: string[], pageContext: PageContext) {
    send({ type: 'init', toolNames, pageContext })
    isReady.value = true
    hasBeenReady.value = true

    // Try to restore the latest conversation, but skip if a prompt is already
    // queued (panel just opened from a dropdown action — start fresh).
    if (adapter.agentConversations && !pendingPrompt) {
      try {
        const latest = await adapter.agentConversations.loadLatest()
        if (latest) {
          const parsed = parseConversationData(latest)
          if (parsed) {
            activeConversationId.value = latest.uuid
            conversation.value = parsed.conversation
            usageTurns.value = parsed.usageTurns
            send({ type: 'restore_conversation', state: parsed.serverState })
          }
        }
      } catch (e) {
        console.warn('[blokkli agent] Failed to load latest conversation:', e)
      }
    }

    if (pendingPrompt) {
      const { prompt, displayPrompt, selectedUuids, attachments } =
        pendingPrompt
      pendingPrompt = null
      sendPrompt(prompt, displayPrompt, selectedUuids, attachments)
    }
  }

  // ============================================================================
  // Page Context Builder
  // ============================================================================

  async function buildPageContext(
    contentSearchTabs?: PageContext['contentSearchTabs'],
  ): Promise<PageContext> {
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

      const paragraphFields = types.fieldConfig
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
        paragraphFields: paragraphFields,
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

    // Build analyzer metadata if available.
    await app.analyze.ensureInitialized()
    const analyzersList = app.analyze.analyzers.value
      .filter((a) => !a.requireRawPage)
      .map((a) => ({
        id: a.id,
        type: a.type,
        label:
          typeof a.label === 'function'
            ? a.label(context.value.language)
            : a.label,
        description:
          typeof a.description === 'function'
            ? a.description(context.value.language)
            : a.description,
      }))

    const pageContext: PageContext = {
      title: state.entity.value.label || '',
      entityType: context.value.entityType,
      entityUuid: context.value.entityUuid,
      entityBundle: context.value.entityBundle,
      bundleLabel: state.entity.value.bundleLabel || '',
      itemEntityType,
      bundles,
      interfaceLanguage: ui.interfaceLanguage.value,
      entityLanguage: context.value.language,
      isPublished: state.entity.value.status ?? null,
      editMode: state.editMode.value,
      fragments,
      entityContentFields,
      ...(contentSearchTabs?.length ? { contentSearchTabs } : {}),
      ...(analyzersList.length ? { analyzers: analyzersList } : {}),
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
      case 'authenticated':
        if (pendingInit) {
          sendInit(pendingInit.toolNames, pendingInit.pageContext)
          pendingInit = null
        }
        break

      case 'thinking':
        // Discard any partial text from a previous failed stream attempt
        // (e.g. when the server retries after a transient error).
        // We don't finalize because the partial text is incomplete/broken.
        activeItem.value = null
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

      case 'usage':
        usageTurns.value = [...usageTurns.value, data.usage]
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
          ...(data.retryable ? { retryable: true } : {}),
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

      case 'plan_update':
        if (
          data.plan &&
          data.plan.steps.length > 0 &&
          data.plan.steps.every((s) => s.status === 'completed')
        ) {
          // All steps completed — add a conversation item and clear the plan
          conversation.value.push({
            type: 'server_tool',
            id: generateId(),
            tool: 'plan_completed',
            label: data.plan.title,
            timestamp: Date.now(),
          })
          plan.value = null
        } else {
          plan.value = data.plan
        }
        break

      case 'transcript':
        transcriptContent.value = data.transcript
        showTranscript.value = true
        break

      case 'conversation_state':
        saveCurrentConversation(data.state)
        break

      case 'conversation_restored':
        // UI already restored from adapter data — no action needed
        break

      case 'conversation_restore_failed':
        console.warn(
          '[blokkli agent] Conversation restore failed:',
          data.reason,
        )
        conversation.value = []
        // Remove the failed conversation via adapter
        if (activeConversationId.value) {
          const failedId = activeConversationId.value
          activeConversationId.value = null

          if (adapter.agentConversations) {
            adapter.agentConversations.delete(failedId).catch(() => {
              // Ignore delete errors for failed conversations
            })
          }
        }
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

        // Store ephemeral details if the tool provides a buildDetails callback.
        if (toolDef.buildDetails) {
          try {
            // Check for _details on the result (set by interactive components).
            const detailsSource =
              typeof result === 'object' &&
              result !== null &&
              '_details' in result
                ? (result as Record<string, unknown>)._details
                : result
            const details = toolDef.buildDetails(detailsSource)
            if (details != null) {
              toolDetails.set(callId, details)
            }
          } catch {
            // buildDetails failed — skip
          }
        }

        // Inject _summary from prunedSummary callback for use during server-side pruning.
        // Also strip _details and _usage (ephemeral, not sent to server).
        let resultForServer: unknown = result
        if (typeof result === 'object' && result !== null) {
          const rec = result as Record<string, unknown>
          if ('_usage' in rec && rec._usage) {
            usageTurns.value = [...usageTurns.value, rec._usage as UsageTurn]
          }
          if ('_details' in rec || '_usage' in rec) {
            const { _details: _, _usage: __, ...rest } = rec
            resultForServer = rest
          }
        }
        if (
          toolDef.prunedSummary &&
          typeof resultForServer === 'object' &&
          resultForServer !== null
        ) {
          try {
            const summary = toolDef.prunedSummary(resultForServer)
            if (summary) {
              resultForServer = {
                ...(resultForServer as Record<string, unknown>),
                _summary: summary,
              }
            }
          } catch {
            // prunedSummary failed — send original result
          }
        }

        send({
          type: 'tool_result',
          callId,
          result: resultForServer,
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
      pageContext: storedPageContext.value,
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
      const newParagraphs =
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
                    ? { paragraphFields: blockFieldNames }
                    : {}),
                }
              })
              .filter(
                (
                  b,
                ): b is {
                  uuid: string
                  bundle: string
                  paragraphFields?: string[]
                } => b !== null,
              )
          : undefined

      return {
        success: true,
        historyIndex: state.currentMutationIndex.value,
        newParagraphs: newParagraphs?.length ? newParagraphs : undefined,
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
    attachments?: Attachment[],
  ) {
    if (!prompt.trim() || isProcessing.value) return

    if (!isReady.value) {
      pendingPrompt = { prompt, displayPrompt, selectedUuids, attachments }
      return
    }

    isProcessing.value = true

    // Ensure we have a conversation ID
    if (!activeConversationId.value) {
      activeConversationId.value = generateUUID()
    }

    const item: ConversationItem = {
      type: 'user',
      id: generateId(),
      content: displayPrompt ?? prompt,
      timestamp: Date.now(),
    }
    if (attachments?.length) {
      ;(item as { attachments?: Attachment[] }).attachments = attachments
    }
    conversation.value.push(item)

    send({
      type: 'start',
      prompt,
      selectedUuids: selectedUuids?.length ? selectedUuids : undefined,
    })
  }

  function retry() {
    if (isProcessing.value || !isReady.value) return

    // Find the last user message as the prompt to retry
    const lastUserItem = [...conversation.value]
      .reverse()
      .find((item) => item.type === 'user')
    if (!lastUserItem || lastUserItem.type !== 'user') return

    // Remove the error item from conversation
    conversation.value = conversation.value.filter(
      (item) =>
        !(item.type === 'error' && 'retryable' in item && item.retryable),
    )

    isProcessing.value = true

    send({
      type: 'start',
      prompt: lastUserItem.content,
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

  function approvePlan() {
    send({ type: 'plan_approve' })
  }

  function rejectPlan() {
    send({ type: 'plan_reject' })
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

    // Clear client state (old conversation stays persisted)
    conversation.value = []
    activeItem.value = null
    isProcessing.value = false
    isThinking.value = false
    activeConversationId.value = null
    plan.value = null
    usageTurns.value = []
    toolDetails.clear()

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
    hasBeenReady: readonly(hasBeenReady),
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

    // Plan state
    plan,
    approvePlan,
    rejectPlan,

    // Token usage
    usageTurns,

    // Actions
    sendPrompt,
    retry,
    approve,
    reject,
    setAutoApprove,
    cancel,
    newConversation,
    getTranscript,
    onToolComponentDone,

    // Tool details (ephemeral)
    toolDetails,

    // Transcript dialog state
    transcriptContent,
    showTranscript,

    // Conversation list
    conversationList,
    showConversationList,
    activeConversationId: readonly(activeConversationId),
    switchConversation,
    deleteConversation,
    refreshConversationList,

    // Page context (built once during connection)
    pageContext: storedPageContext,
  }
}
