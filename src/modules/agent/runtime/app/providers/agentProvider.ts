import { ref, watch, type Ref } from '#imports'
import type {
  Attachment,
  PreSeededToolResult,
  AutoExecuteTool,
} from '#blokkli/agent/app/types'
import type {
  ServerMessage,
  PageContext,
  UsageTurn,
} from '#blokkli/agent/shared/types'
import type { BlokkliApp } from '#blokkli/editor/types/app'
import type { FullBlokkliAdapter } from '#blokkli/editor/adapter'
import { routeRoute } from '#blokkli-build/agent-client'
import { buildPageContext } from '#blokkli/agent/app/helpers/buildPageContext'
import type { SocketProvider } from './socketProvider'
import type { ConversationProvider } from './conversationProvider'
import type { PlanProvider } from './planProvider'
import type { ToolsProvider } from './toolsProvider'

type PendingPrompt = {
  prompt: string
  displayPrompt?: string
  selectedUuids?: string[]
  attachments?: Attachment[]
  autoLoadTools?: string[]
  autoLoadSkills?: string[]
  preSeededResults?: PreSeededToolResult[]
  autoExecuteTools?: AutoExecuteTool[]
}

type PendingInit = {
  toolNames: string[]
  pageContext: PageContext
}

export type AgentOrchestrator = {
  isReady: Ref<boolean>
  hasBeenReady: Ref<boolean>
  isProcessing: Ref<boolean>
  isThinking: Ref<boolean>

  connect: () => void
  disconnect: () => void

  sendPrompt: (
    prompt: string,
    displayPrompt?: string,
    selectedUuids?: string[],
    attachments?: Attachment[],
    autoLoadTools?: string[],
    autoLoadSkills?: string[],
    preSeededResults?: PreSeededToolResult[],
    autoExecuteTools?: AutoExecuteTool[],
  ) => void
  retry: () => void
  cancel: () => void
  newConversation: () => void
  getTranscript: () => void

  switchConversation: (id: string) => Promise<void>
  deleteConversation: (id: string) => Promise<void>
  refreshConversationList: () => Promise<void>
}

export default function agentProvider({
  app,
  adapter,
  agentName,
  socket,
  conversation,
  plan,
  tools,
}: {
  app: BlokkliApp
  adapter: FullBlokkliAdapter<any>
  agentName: string
  socket: SocketProvider
  conversation: ConversationProvider
  plan: PlanProvider
  tools: ToolsProvider
}): AgentOrchestrator {
  const { ui } = app

  const isReady = ref(false)
  const hasBeenReady = ref(false)
  const isProcessing = ref(false)
  const isThinking = ref(false)

  let pendingPrompt: PendingPrompt | null = null
  let pendingInit: PendingInit | null = null
  let sentToolNames: string[] = []

  // Mirror processing state into the editor's transform-blocking flag so
  // editing is disabled while the agent is busy.
  watch(isProcessing, (processing) => {
    ui.setTransform(processing ? agentName : null)
  })

  function resetActivityFlags(): void {
    isProcessing.value = false
    isThinking.value = false
  }

  // Cleanup applied on both intentional disconnect and unexpected close.
  function teardown(): void {
    isReady.value = false
    resetActivityFlags()
    ui.setTransform(null)
    tools.cancelPending()
  }

  function connect(): void {
    socket.connect()
  }

  function disconnect(): void {
    socket.disconnect()
    teardown()
  }

  // --------------------------------------------------------------------------
  // Connection bootstrap
  // --------------------------------------------------------------------------

  async function onSocketOpen(): Promise<void> {
    const { toolNames } = await tools.init()
    sentToolNames = toolNames

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
          conversation.pushError({ errorType: 'unauthorized' })
          disconnect()
          return
        }
        // Build pageContext before sending authenticate so pendingInit is
        // ready when the 'authenticated' response arrives.
        const pageContext = await buildPageContext(app, contentSearchTabs)
        tools.setPageContext(pageContext)
        pendingInit = { toolNames, pageContext }
        socket.send({ type: 'authenticate', authToken })
        return
      } catch (e) {
        console.error('Failed to obtain agent auth token:', e)
      }
    }

    const pageContext = await buildPageContext(app, contentSearchTabs)
    tools.setPageContext(pageContext)
    sendInit(toolNames, pageContext)
  }

  async function sendInit(
    toolNames: string[],
    pageContext: PageContext,
  ): Promise<void> {
    socket.send({ type: 'init', toolNames, pageContext })
    isReady.value = true
    hasBeenReady.value = true

    // Skip auto-restore if a prompt is already queued — the panel was just
    // opened from a dropdown action and should start fresh.
    if (adapter.agentConversations && !pendingPrompt) {
      const latest = await conversation.loadLatestFromAdapter()
      if (latest) {
        conversation.activeConversationId.value = latest.uuid
        conversation.applyRestoredData(latest.parsed)
        socket.send({
          type: 'restore_conversation',
          state: latest.parsed.serverState,
        })
      }
    }

    if (pendingPrompt) {
      const queued = pendingPrompt
      pendingPrompt = null
      sendPrompt(
        queued.prompt,
        queued.displayPrompt,
        queued.selectedUuids,
        queued.attachments,
        queued.autoLoadTools,
        queued.autoLoadSkills,
        queued.preSeededResults,
        queued.autoExecuteTools,
      )
    }
  }

  // --------------------------------------------------------------------------
  // Server message routing
  // --------------------------------------------------------------------------

  function handleServerMessage(data: ServerMessage): void {
    switch (data.type) {
      case 'authenticated':
        if (pendingInit) {
          sendInit(pendingInit.toolNames, pendingInit.pageContext)
          pendingInit = null
        }
        break

      case 'thinking':
        // Discard any partial streaming text from a failed stream attempt —
        // do not finalize, the partial text is incomplete.
        conversation.setActive(null)
        isThinking.value = true
        break

      case 'text':
      case 'text_delta':
        isThinking.value = false
        conversation.appendToActive(data.content)
        break

      case 'tool_call':
        conversation.finalizeActive()
        tools.dispatch(data.callId, data.tool, data.params)
        break

      case 'usage':
        conversation.pushUsage(data.usage)
        break

      case 'done':
        conversation.finalizeActive()
        resetActivityFlags()
        if (data.message) {
          conversation.pushAssistantUnlessDuplicate(data.message)
        }
        break

      case 'error':
        conversation.finalizeActive()
        resetActivityFlags()
        if (data.detail) {
          console.warn(`[blokkli agent] ${data.errorType} error:`, data.detail)
        }
        conversation.pushError({
          errorType: data.errorType,
          retryable: data.retryable,
        })
        break

      case 'server_tool_result':
        conversation.finalizeActive()
        conversation.pushServerTool({ tool: data.tool, label: data.label })
        break

      case 'plan_update':
        plan.applyUpdate(data.plan)
        break

      case 'transcript':
        conversation.setTranscript(data.transcript)
        break

      case 'conversation_state':
        conversation.saveToAdapter(data.state)
        break

      case 'conversation_restored':
        break

      case 'conversation_restore_failed': {
        console.warn(
          '[blokkli agent] Conversation restore failed:',
          data.reason,
        )
        const failedId = conversation.activeConversationId.value
        conversation.clearAll()
        if (failedId) {
          conversation.deleteFromAdapter(failedId).catch(() => {})
        }
        break
      }
    }
  }

  // Wire socket → orchestrator.
  socket.setMessageHandler(handleServerMessage)
  socket.setLifecycleHandlers({
    onOpen: () => {
      onSocketOpen()
    },
    onClose: teardown,
    onMaxReconnects: () => {
      conversation.pushError({ errorType: 'connection' })
    },
  })

  // --------------------------------------------------------------------------
  // User actions
  // --------------------------------------------------------------------------

  async function sendPrompt(
    prompt: string,
    displayPrompt?: string,
    selectedUuids?: string[],
    attachments?: Attachment[],
    autoLoadTools?: string[],
    autoLoadSkills?: string[],
    preSeededResults?: PreSeededToolResult[],
    autoExecuteTools?: AutoExecuteTool[],
  ): Promise<void> {
    if (!prompt.trim() || isProcessing.value) return

    if (!isReady.value) {
      pendingPrompt = {
        prompt,
        displayPrompt,
        selectedUuids,
        attachments,
        autoLoadTools,
        autoLoadSkills,
        preSeededResults,
        autoExecuteTools,
      }
      return
    }

    isProcessing.value = true
    conversation.ensureConversationId()

    // Push user message + show thinking before any async work so the UI
    // stays responsive while routing fetches.
    conversation.pushUser(displayPrompt ?? prompt, attachments)
    isThinking.value = true

    const isFirstMessage =
      conversation.items.value.filter((v) => v.type === 'user').length === 1
    const hasClientDirectives = !!(
      autoLoadTools?.length || autoLoadSkills?.length
    )

    let resolvedAutoLoadTools = autoLoadTools
    let resolvedAutoLoadSkills = autoLoadSkills

    if (isFirstMessage && !hasClientDirectives && tools.pageContext.value) {
      try {
        const routingResult = await fetch(routeRoute, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            toolNames: sentToolNames,
            pageContext: tools.pageContext.value,
          }),
        }).then(
          (r) =>
            r.json() as Promise<{
              skills: string[]
              tools: string[]
              usage: UsageTurn | null
            }>,
        )

        if (routingResult.usage) {
          conversation.pushUsage(routingResult.usage)
        }
        if (routingResult.tools?.length) {
          resolvedAutoLoadTools = [
            ...(resolvedAutoLoadTools || []),
            ...routingResult.tools,
          ]
        }
        if (routingResult.skills?.length) {
          resolvedAutoLoadSkills = [
            ...(resolvedAutoLoadSkills || []),
            ...routingResult.skills,
          ]
        }
      } catch {
        // Routing failed — proceed without preloaded skills/tools.
      }
    }

    const serverPreSeeded = preSeededResults?.length
      ? preSeededResults.map(({ toolName, params, result }) => ({
          toolName,
          params,
          result,
        }))
      : undefined

    socket.send({
      type: 'start',
      prompt,
      selectedUuids: selectedUuids?.length ? selectedUuids : undefined,
      autoLoadTools: resolvedAutoLoadTools?.length
        ? resolvedAutoLoadTools
        : undefined,
      autoLoadSkills: resolvedAutoLoadSkills?.length
        ? resolvedAutoLoadSkills
        : undefined,
      preSeededResults: serverPreSeeded,
      autoExecuteTools: autoExecuteTools?.length ? autoExecuteTools : undefined,
    })
  }

  function retry(): void {
    if (isProcessing.value || !isReady.value) return

    const lastUserItem = [...conversation.items.value]
      .reverse()
      .find((item) => item.type === 'user')
    if (!lastUserItem || lastUserItem.type !== 'user') return

    conversation.items.value = conversation.items.value.filter(
      (item) =>
        !(item.type === 'error' && 'retryable' in item && item.retryable),
    )

    isProcessing.value = true
    socket.send({ type: 'start', prompt: lastUserItem.content })
  }

  function cancel(): void {
    tools.cancelPending()
    conversation.setActive(null)
    socket.send({ type: 'cancel' })
    resetActivityFlags()
    conversation.pushAssistant(app.$t('aiAgentCancelled', 'Cancelled'))
  }

  function newConversation(): void {
    tools.cancelPending()
    conversation.clearAll()
    plan.clear()
    resetActivityFlags()
    socket.send({ type: 'new_conversation' })
  }

  function getTranscript(): void {
    socket.send({ type: 'get_transcript' })
  }

  // --------------------------------------------------------------------------
  // Conversation list operations (compose conversation + socket actions)
  // --------------------------------------------------------------------------

  async function switchConversation(id: string): Promise<void> {
    if (isProcessing.value) return

    const parsed = await conversation.loadFromAdapter(id)
    if (!parsed) return

    conversation.applyRestoredData(parsed)
    conversation.activeConversationId.value = id
    socket.send({ type: 'restore_conversation', state: parsed.serverState })
    conversation.showConversationList.value = false
  }

  async function deleteConversation(id: string): Promise<void> {
    await conversation.deleteFromAdapter(id)

    if (conversation.activeConversationId.value === id) {
      conversation.clearAll()
      resetActivityFlags()
      socket.send({ type: 'new_conversation' })
    }

    await conversation.refreshList()
  }

  return {
    isReady,
    hasBeenReady,
    isProcessing,
    isThinking,

    connect,
    disconnect,

    sendPrompt,
    retry,
    cancel,
    newConversation,
    getTranscript,

    switchConversation,
    deleteConversation,
    refreshConversationList: conversation.refreshList,
  }
}
