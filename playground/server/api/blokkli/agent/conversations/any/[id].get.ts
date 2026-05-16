type User = {
  id: string
  name: string
  imageUrl: string | null
}

type FeedbackItem = {
  id: string
  createdAt: string
  rating: 'bad' | 'fine' | 'good'
  comment: string | null
  itemId: string
  author: User
  conversationUuid: string
}

type AgentConversationData = {
  uuid: string
  title: string
  createdAt: string
  updatedAt: string
  host: {
    entityType: string
    entityUuid: string
    label: string | null
    editUrl: string | null
  }
  author: User
  clientState: string
  serverState: string
  hash: string
  feedbackItemIds: string[]
  feedback: FeedbackItem[]
}

type StoredFeedback = {
  id?: string
  createdAt?: string
  author?: User
  itemId: string
  rating: 'bad' | 'fine' | 'good'
  explanation?: string
}

export default defineEventHandler<Promise<AgentConversationData | null>>(
  async (event) => {
    const id = getRouterParam(event, 'id')
    if (!id) {
      throw createError({ statusCode: 400, message: 'id is required' })
    }

    const storage = useAgentConversationStorage()
    const keys = await storage.getKeys()
    const match = keys.find((k) => k.endsWith(`:${id}`))
    if (!match) return null

    const data = await storage.getItem(match)
    if (!data || typeof data !== 'object') return null

    const conv = data as Omit<
      AgentConversationData,
      'host' | 'author' | 'feedback' | 'feedbackItemIds'
    > & {
      feedback?: StoredFeedback[]
      feedbackItemIds?: string[]
    }
    const [entityType, entityUuid] = match.split(':')
    if (!entityType || !entityUuid) return null

    const stored = conv.feedback ?? []
    const feedback: FeedbackItem[] = stored.map((f) => ({
      id: f.id ?? `legacy-${conv.uuid}-${f.itemId}`,
      createdAt: f.createdAt ?? conv.updatedAt,
      rating: f.rating,
      comment: f.explanation ?? null,
      itemId: f.itemId,
      author: f.author ?? { id: '1', name: 'John Wayne', imageUrl: null },
      conversationUuid: conv.uuid,
    }))

    return {
      uuid: conv.uuid,
      title: conv.title,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
      clientState: conv.clientState,
      serverState: conv.serverState,
      hash: conv.hash,
      host: {
        entityType,
        entityUuid,
        label: `${entityType} ${entityUuid.slice(0, 8)}`,
        editUrl: null,
      },
      author: {
        id: '1',
        name: 'John Wayne',
        imageUrl: null,
      },
      feedbackItemIds: feedback.map((f) => f.itemId),
      feedback,
    }
  },
)
