import { ref, reactive, type Ref } from '#imports'
import {
  conversationItemSchema,
  type ConversationItem,
  type ActiveItem,
  type AssistantConversationItem,
  type ToolConversationItem,
  type ServerToolConversationItem,
  type ErrorConversationItem,
  type Attachment,
} from '#blokkli/agent/app/types'
import type {
  ConversationStateSnapshot,
  UsageTurn,
  Transcript,
} from '#blokkli/agent/shared/types'
import type {
  AgentConversationData,
  AgentConversationSummary,
} from '#blokkli/agent/app/features/agent/types'
import type { FullBlokkliAdapter } from '#blokkli/editor/adapter'
import { generateUUID } from '#blokkli/editor/helpers/uuid'

export type ParsedConversation = {
  conversation: ConversationItem[]
  usageTurns: UsageTurn[]
  serverState: ConversationStateSnapshot
  feedbackItemIds: string[]
}

export type ConversationProvider = {
  // History state
  items: Ref<ConversationItem[]>
  activeItem: Ref<ActiveItem | null>
  usageTurns: Ref<UsageTurn[]>
  feedbackItemIds: Ref<Set<string>>
  toolDetails: Map<string, unknown>

  // Conversation list state
  activeConversationId: Ref<string | null>
  conversationList: Ref<AgentConversationSummary[]>
  showConversationList: Ref<boolean>

  // Transcript dialog state
  transcriptContent: Ref<Transcript | null>
  showTranscript: Ref<boolean>

  // History mutation
  pushUser: (content: string, attachments?: Attachment[]) => void
  appendToActive: (text: string) => void
  setActive: (item: ActiveItem | null) => void
  finalizeActive: () => void
  pushAssistant: (content: string) => void
  pushAssistantUnlessDuplicate: (content: string) => void
  pushTool: (item: ToolConversationItem) => void
  pushServerTool: (
    item: Pick<ServerToolConversationItem, 'tool' | 'label'>,
  ) => void
  pushError: (
    item: Pick<ErrorConversationItem, 'errorType' | 'retryable'>,
  ) => void
  pushUsage: (turn: UsageTurn) => void
  setToolDetail: (callId: string, details: unknown) => void

  // Resets
  clearAll: () => void
  ensureConversationId: () => string

  // Transcript dialog
  setTranscript: (transcript: Transcript) => void

  // Restoration
  applyRestoredData: (parsed: ParsedConversation) => void
  parseFromAdapter: (data: AgentConversationData) => ParsedConversation | null

  // Adapter-backed persistence
  saveToAdapter: (serverState: ConversationStateSnapshot) => Promise<void>
  loadFromAdapter: (uuid: string) => Promise<ParsedConversation | null>
  loadLatestFromAdapter: () => Promise<{
    parsed: ParsedConversation
    uuid: string
  } | null>
  deleteFromAdapter: (uuid: string) => Promise<void>
  refreshList: () => Promise<void>
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

export default function conversationProvider({
  adapter,
}: {
  adapter: FullBlokkliAdapter<any>
}): ConversationProvider {
  const items = ref<ConversationItem[]>([])
  const activeItem = ref<ActiveItem | null>(null)
  const usageTurns = ref<UsageTurn[]>([])
  const feedbackItemIds = ref(new Set<string>())
  const toolDetails: Map<string, unknown> = reactive(new Map())

  const activeConversationId = ref<string | null>(null)
  const conversationList = ref<AgentConversationSummary[]>([])
  const showConversationList = ref(false)

  const transcriptContent = ref<Transcript | null>(null)
  const showTranscript = ref(false)

  function pushUser(content: string, attachments?: Attachment[]): void {
    items.value.push({
      type: 'user',
      id: generateId(),
      content,
      timestamp: Date.now(),
      attachments: attachments?.length ? attachments : undefined,
    })
  }

  function appendToActive(text: string): void {
    if (activeItem.value?.type === 'assistant') {
      activeItem.value = {
        ...activeItem.value,
        content: activeItem.value.content + text,
      }
    } else {
      activeItem.value = {
        type: 'assistant',
        id: generateId(),
        content: text,
        timestamp: Date.now(),
      }
    }
  }

  function setActive(item: ActiveItem | null): void {
    activeItem.value = item
  }

  function finalizeActive(): void {
    const item = activeItem.value
    if (!item) return
    if (item.type === 'assistant' && item.content) {
      const finalized: AssistantConversationItem = {
        type: 'assistant',
        id: item.id,
        content: item.content,
        timestamp: item.timestamp,
      }
      items.value.push(finalized)
    }
    activeItem.value = null
  }

  function pushAssistant(content: string): void {
    items.value.push({
      type: 'assistant',
      id: generateId(),
      content,
      timestamp: Date.now(),
    })
  }

  function pushAssistantUnlessDuplicate(content: string): void {
    const last = items.value[items.value.length - 1]
    if (last?.type === 'assistant' && last.content === content) return
    pushAssistant(content)
  }

  function pushTool(item: ToolConversationItem): void {
    items.value.push(item)
  }

  function pushServerTool(
    item: Pick<ServerToolConversationItem, 'tool' | 'label'>,
  ): void {
    items.value.push({
      type: 'server_tool',
      id: generateId(),
      timestamp: Date.now(),
      tool: item.tool,
      label: item.label,
    })
  }

  function pushError(
    item: Pick<ErrorConversationItem, 'errorType' | 'retryable'>,
  ): void {
    items.value.push({
      type: 'error',
      id: generateId(),
      timestamp: Date.now(),
      errorType: item.errorType,
      ...(item.retryable ? { retryable: true } : {}),
    })
  }

  function pushUsage(turn: UsageTurn): void {
    usageTurns.value = [...usageTurns.value, turn]
  }

  function setToolDetail(callId: string, details: unknown): void {
    toolDetails.set(callId, details)
  }

  function clearAll(): void {
    items.value = []
    activeItem.value = null
    activeConversationId.value = null
    usageTurns.value = []
    feedbackItemIds.value = new Set()
    toolDetails.clear()
  }

  function ensureConversationId(): string {
    if (!activeConversationId.value) {
      activeConversationId.value = generateUUID()
    }
    return activeConversationId.value
  }

  function setTranscript(transcript: Transcript): void {
    transcriptContent.value = transcript
    showTranscript.value = true
  }

  function parseFromAdapter(
    data: AgentConversationData,
  ): ParsedConversation | null {
    try {
      const parsed: {
        conversation?: unknown[]
        usageTurns?: UsageTurn[]
      } = JSON.parse(data.clientState)

      if (!parsed.conversation?.length) return null

      const clientConversation: ConversationItem[] = parsed.conversation.map(
        (item) => {
          const result = conversationItemSchema.safeParse(item)
          if (result.success) return result.data
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

      if (!serverParsed?.messages?.length) return null

      return {
        conversation: clientConversation,
        usageTurns: parsed.usageTurns ?? [],
        feedbackItemIds: data.feedbackItemIds ?? [],
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

  function applyRestoredData(parsed: ParsedConversation): void {
    items.value = parsed.conversation
    usageTurns.value = parsed.usageTurns
    feedbackItemIds.value = new Set(parsed.feedbackItemIds)
    activeItem.value = null
  }

  async function saveToAdapter(
    serverState: ConversationStateSnapshot,
  ): Promise<void> {
    if (!adapter.agentConversations) return
    if (!items.value.length) return

    const id = ensureConversationId()

    const firstUser = items.value.find((item) => item.type === 'user')
    const titleText =
      firstUser && 'content' in firstUser ? firstUser.content : ''
    const title =
      titleText.length > 80 ? titleText.slice(0, 80) + '…' : titleText

    try {
      await adapter.agentConversations.upsert({
        uuid: id,
        title,
        clientState: JSON.stringify({
          conversation: items.value.filter((item) => item.type !== 'error'),
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

  async function loadFromAdapter(
    uuid: string,
  ): Promise<ParsedConversation | null> {
    if (!adapter.agentConversations) return null
    try {
      const data = await adapter.agentConversations.load(uuid)
      if (!data) return null
      return parseFromAdapter(data)
    } catch (e) {
      console.warn('[blokkli agent] Failed to load conversation:', e)
      return null
    }
  }

  async function loadLatestFromAdapter(): Promise<{
    parsed: ParsedConversation
    uuid: string
  } | null> {
    if (!adapter.agentConversations) return null
    try {
      const latest = await adapter.agentConversations.loadLatest()
      if (!latest) return null
      const parsed = parseFromAdapter(latest)
      if (!parsed) return null
      return { parsed, uuid: latest.uuid }
    } catch (e) {
      console.warn('[blokkli agent] Failed to load latest conversation:', e)
      return null
    }
  }

  async function deleteFromAdapter(uuid: string): Promise<void> {
    if (!adapter.agentConversations) return
    try {
      await adapter.agentConversations.delete(uuid)
    } catch (e) {
      console.warn('[blokkli agent] Failed to delete conversation:', e)
    }
  }

  async function refreshList(): Promise<void> {
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

  return {
    items,
    activeItem,
    usageTurns,
    feedbackItemIds,
    toolDetails,

    activeConversationId,
    conversationList,
    showConversationList,

    transcriptContent,
    showTranscript,

    pushUser,
    appendToActive,
    setActive,
    finalizeActive,
    pushAssistant,
    pushAssistantUnlessDuplicate,
    pushTool,
    pushServerTool,
    pushError,
    pushUsage,
    setToolDetail,

    clearAll,
    ensureConversationId,

    setTranscript,

    applyRestoredData,
    parseFromAdapter,

    saveToAdapter,
    loadFromAdapter,
    loadLatestFromAdapter,
    deleteFromAdapter,
    refreshList,
  }
}
