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

type StoredFeedback = {
  id?: string
  createdAt?: string
  author?: User
  itemId: string
  rating: 'bad' | 'fine' | 'good'
  explanation?: string
}

type StoredConversation = {
  uuid: string
  title: string
  createdAt: string
  updatedAt: string
  feedback?: StoredFeedback[]
}

type QueryResult = {
  filters: never[]
  items: FeedbackItem[]
  total: number
  perPage: number
}

const PER_PAGE = 50

export default defineEventHandler<Promise<QueryResult>>(async (event) => {
  const query = getQuery(event)
  const page = Math.max(0, parseInt((query.page as string) ?? '0', 10) || 0)

  const storage = useAgentConversationStorage()
  const keys = await storage.getKeys()

  const all: FeedbackItem[] = []

  for (const key of keys) {
    const data = await storage.getItem(key)
    if (!data || typeof data !== 'object') continue
    const conv = data as StoredConversation
    if (!conv.feedback?.length) continue

    for (const f of conv.feedback) {
      all.push({
        id: f.id ?? `legacy-${conv.uuid}-${f.itemId}`,
        createdAt: f.createdAt ?? conv.updatedAt,
        rating: f.rating,
        comment: f.explanation ?? null,
        itemId: f.itemId,
        author: f.author ?? {
          id: '1',
          name: 'John Wayne',
          imageUrl: null,
        },
        conversationUuid: conv.uuid,
      })
    }
  }

  const sorted = all.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const start = page * PER_PAGE
  const pageItems = sorted.slice(start, start + PER_PAGE)

  return {
    filters: [],
    items: pageItems,
    total: sorted.length,
    perPage: PER_PAGE,
  }
})
