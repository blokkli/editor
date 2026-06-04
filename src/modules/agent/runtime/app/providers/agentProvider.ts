import { ref, watch, type Ref } from '#imports'
import type {
  Attachment,
  PreSeededToolResult,
  AutoExecuteTool,
} from '#blokkli/agent/app/types'
import type {
  ServerMessage,
  PageContext,
  SelectedBlock,
  UsageTurn,
} from '#blokkli/agent/shared/types'
import type { BlokkliApp } from '#blokkli/editor/types/app'
import type { FullBlokkliAdapter } from '#blokkli/editor/adapter'
import { enableMock, routeRoute } from '#blokkli-build/agent-client'
import { buildPageContext } from '#blokkli/agent/app/helpers/buildPageContext'
import { readMockScript } from '#blokkli/agent/app/helpers/mockScript'
import {
  computeHistorySignature,
  isHistorySnapshotReachable,
} from '#blokkli/agent/app/helpers/historySignature'
import type { SocketProvider } from './socketProvider'
import type { ConversationProvider } from './conversationProvider'
import type { PlanProvider } from './planProvider'
import type { ToolsProvider } from './toolsProvider'

export type SendPromptOptions = {
  prompt: string
  displayPrompt?: string
  selectedBlocks?: SelectedBlock[]
  attachments?: Attachment[]
  autoLoadTools?: string[]
  autoLoadSkills?: string[]
  preSeededResults?: PreSeededToolResult[]
  autoExecuteTools?: AutoExecuteTool[]
  /**
   * When set, the server truncates Session.messages at the Nth real user
   * turn (0-based) before processing this prompt. Used by retry/edit.
   */
  rollbackToUserMessageIndex?: number
  /**
   * Id of the prompt definition that triggered this send, if any. Stored on
   * the user message so retry can re-run `preExecute` against current
   * (post-rollback) page state.
   */
  promptId?: string
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

  sendPrompt: (options: SendPromptOptions) => void
  retry: (targetItemId?: string) => void
  rollbackAndSend: (targetItemId: string, newPrompt?: string) => void
  cancel: () => void
  newConversation: () => void
  getTranscript: () => void

  switchConversation: (id: string) => Promise<void>
  deleteConversation: (id: string) => Promise<void>
  refreshConversationList: () => Promise<void>
}

/**
 * Build the replayable send context stored on the user message — the data
 * retry/edit needs to re-run a prompt byte-for-byte (preExecute can read
 * arbitrary editor state, so this cannot be re-derived later). Returns
 * `undefined` when there's nothing worth storing.
 */
function buildSendContext(options: SendPromptOptions) {
  const {
    prompt,
    displayPrompt,
    selectedBlocks,
    autoLoadTools,
    autoLoadSkills,
    preSeededResults,
    autoExecuteTools,
    promptId,
  } = options

  const hasData =
    !!promptId ||
    (displayPrompt !== undefined && displayPrompt !== prompt) ||
    !!selectedBlocks?.length ||
    !!autoLoadTools?.length ||
    !!autoLoadSkills?.length ||
    !!preSeededResults?.length ||
    !!autoExecuteTools?.length
  if (!hasData) return undefined

  return {
    promptId,
    serverPrompt:
      displayPrompt !== undefined && displayPrompt !== prompt
        ? prompt
        : undefined,
    selectedBlocks: selectedBlocks?.length ? [...selectedBlocks] : undefined,
    autoLoadTools: autoLoadTools?.length ? [...autoLoadTools] : undefined,
    autoLoadSkills: autoLoadSkills?.length ? [...autoLoadSkills] : undefined,
    preSeededResults: preSeededResults?.length ? preSeededResults : undefined,
    autoExecuteTools: autoExecuteTools?.length ? autoExecuteTools : undefined,
  }
}

/**
 * Ask the routing endpoint which skills/tools to preload for the first message.
 * Swallows failures (returns empty) so a routing outage never blocks the prompt.
 */
async function fetchRouting(
  prompt: string,
  toolNames: string[],
  pageContext: PageContext,
): Promise<{ tools: string[]; skills: string[]; usage: UsageTurn | null }> {
  try {
    return await fetch(routeRoute, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, toolNames, pageContext }),
    }).then(
      (r) =>
        r.json() as Promise<{
          skills: string[]
          tools: string[]
          usage: UsageTurn | null
        }>,
    )
  } catch {
    // Routing failed — proceed without preloaded skills/tools.
    return { tools: [], skills: [], usage: null }
  }
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

  let pendingPrompt: SendPromptOptions | null = null
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
    socket.send({
      type: 'init',
      toolNames,
      pageContext,
      mockScript: enableMock ? readMockScript() : undefined,
    })
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
      sendPrompt(queued)
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

      case 'text_delta':
        isThinking.value = false
        conversation.appendToActive(data.content)
        break

      case 'tool_call':
        conversation.finalizeActive()
        tools.dispatch(data.callId, data.tool, data.params)
        break

      case 'usage':
        // `usage` is sent at message_end — i.e. the assistant turn completed
        // successfully. Commit its streamed text now, decoupled from whether a
        // `tool_call` follows. Without this, a turn whose tool call is not sent
        // to the client (e.g. rejected by server-side validation) would have its
        // text discarded by the next turn's `thinking` (which clears partial
        // text from *failed* streams — those never emit `usage`).
        conversation.finalizeActive()
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

  async function sendPrompt(options: SendPromptOptions): Promise<void> {
    const {
      prompt,
      displayPrompt,
      selectedBlocks,
      attachments,
      autoLoadTools,
      autoLoadSkills,
      preSeededResults,
      autoExecuteTools,
      rollbackToUserMessageIndex,
    } = options

    if (!prompt.trim() || isProcessing.value) return

    if (!isReady.value) {
      pendingPrompt = options
      return
    }

    isProcessing.value = true
    conversation.ensureConversationId()

    // Snapshot editor history at send time so retry/edit can later restore
    // the state to this point.
    const historyMutations = app.state.mutations.value
    const historyIndex = app.state.currentMutationIndex.value
    const historySignature = computeHistorySignature(
      historyMutations,
      historyIndex,
    )

    // Capture the original send context so retry can replay it byte-for-byte.
    const sendContext = buildSendContext(options)

    // Push user message + show thinking before any async work so the UI
    // stays responsive while routing fetches.
    conversation.pushUser(
      displayPrompt ?? prompt,
      attachments,
      { index: historyIndex, signature: historySignature },
      sendContext,
    )
    isThinking.value = true

    const isFirstMessage =
      conversation.items.value.filter((v) => v.type === 'user').length === 1
    const hasClientDirectives = !!(
      autoLoadTools?.length || autoLoadSkills?.length
    )

    let resolvedAutoLoadTools = autoLoadTools
    let resolvedAutoLoadSkills = autoLoadSkills

    if (isFirstMessage && !hasClientDirectives && tools.pageContext.value) {
      const routingResult = await fetchRouting(
        prompt,
        sentToolNames,
        tools.pageContext.value,
      )

      if (routingResult.usage) {
        conversation.pushUsage(routingResult.usage)
      }
      if (routingResult.tools.length) {
        resolvedAutoLoadTools = [
          ...(resolvedAutoLoadTools || []),
          ...routingResult.tools,
        ]
      }
      if (routingResult.skills.length) {
        resolvedAutoLoadSkills = [
          ...(resolvedAutoLoadSkills || []),
          ...routingResult.skills,
        ]
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
      selectedBlocks: selectedBlocks?.length ? selectedBlocks : undefined,
      autoLoadTools: resolvedAutoLoadTools?.length
        ? resolvedAutoLoadTools
        : undefined,
      autoLoadSkills: resolvedAutoLoadSkills?.length
        ? resolvedAutoLoadSkills
        : undefined,
      preSeededResults: serverPreSeeded,
      autoExecuteTools: autoExecuteTools?.length ? autoExecuteTools : undefined,
      rollbackToUserMessageIndex,
    })
  }

  /**
   * Rewind the conversation (and the editor history, when reachable) to the
   * point right before the given user message, then re-run it — optionally
   * with edited text.
   */
  async function rollbackAndSend(
    targetItemId: string,
    newPrompt?: string,
  ): Promise<void> {
    if (isProcessing.value || !isReady.value) return

    const items = conversation.items.value
    const targetIdx = items.findIndex((it) => it.id === targetItemId)
    if (targetIdx < 0) return
    const target = items[targetIdx]
    if (!target || target.type !== 'user') return

    // 0-based index of this user message among user-typed items, matching
    // the count the server uses to identify real user turns.
    const userMessageIndex = items
      .slice(0, targetIdx)
      .filter((it) => it.type === 'user').length

    // Restore editor history if the snapshot is still reachable. Use
    // mutateWithLoadingState so the rest of the editor state syncs.
    const setHistoryIndex = app.adapter.setHistoryIndex
    if (
      setHistoryIndex &&
      isHistorySnapshotReachable(
        app.state.mutations.value,
        target.historyIndexAtSend,
        target.historySignatureAtSend,
      ) &&
      target.historyIndexAtSend !== app.state.currentMutationIndex.value
    ) {
      const targetIndex = target.historyIndexAtSend!
      try {
        await app.state.mutateWithLoadingState(() =>
          setHistoryIndex(targetIndex),
        )
      } catch (e) {
        console.warn('[blokkli agent] Failed to restore editor history:', e)
      }
    }

    // Drop everything from the target onwards. sendPrompt() will push the
    // new user message itself with a fresh history snapshot.
    conversation.items.value = items.slice(0, targetIdx)
    conversation.setActive(null)
    tools.cancelPending()

    const ctx = target.sendContext
    const isEdit = newPrompt !== undefined
    const displayedText = newPrompt ?? target.content
    // Retry: replay the original server prompt (which may differ from the
    // user-visible label) plus preSeeded/autoExecute results. Edit: the
    // intent changed, so drop preSeeded/autoExecute and treat the new text
    // as the prompt itself.
    const serverPrompt = isEdit
      ? displayedText
      : (ctx?.serverPrompt ?? displayedText)

    await sendPrompt({
      prompt: serverPrompt,
      displayPrompt: isEdit ? undefined : displayedText,
      attachments: target.attachments,
      rollbackToUserMessageIndex: userMessageIndex,
      selectedBlocks: ctx?.selectedBlocks,
      autoLoadTools: ctx?.autoLoadTools,
      autoLoadSkills: ctx?.autoLoadSkills,
      preSeededResults: isEdit ? undefined : ctx?.preSeededResults,
      autoExecuteTools: isEdit ? undefined : ctx?.autoExecuteTools,
      promptId: isEdit ? undefined : ctx?.promptId,
    })
  }

  /**
   * Retry button on error states: re-run the last user message in place.
   * Strips retryable error items first so they don't pile up.
   */
  function retry(targetItemId?: string): void {
    if (isProcessing.value || !isReady.value) return

    if (targetItemId) {
      rollbackAndSend(targetItemId)
      return
    }

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
    rollbackAndSend,
    cancel,
    newConversation,
    getTranscript,

    switchConversation,
    deleteConversation,
    refreshConversationList: conversation.refreshList,
  }
}
