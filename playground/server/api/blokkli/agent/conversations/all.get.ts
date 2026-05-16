type ConversationItem = {
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
  author: {
    id: string
    name: string
    imageUrl: string | null
  }
}

type QueryResult = {
  filters: never[]
  items: ConversationItem[]
  total: number
  perPage: number
}

const PER_PAGE = 50

export default defineEventHandler<Promise<QueryResult>>(async (event) => {
  const query = getQuery(event)
  const page = Math.max(0, parseInt((query.page as string) ?? '0', 10) || 0)

  const storage = useAgentConversationStorage()
  const keys = await storage.getKeys()

  const all = await Promise.all(
    keys.map(async (key): Promise<ConversationItem | null> => {
      const data = await storage.getItem(key)
      if (!data || typeof data !== 'object') return null
      const conv = data as {
        uuid: string
        title: string
        createdAt: string
        updatedAt: string
      }
      const [entityType, entityUuid] = key.split(':')
      if (!entityType || !entityUuid) return null
      return {
        uuid: conv.uuid,
        title: conv.title,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
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
      }
    }),
  )

  const items = all
    .filter((s): s is ConversationItem => s !== null)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

  const start = page * PER_PAGE
  const pageItems = items.slice(start, start + PER_PAGE)

  return {
    filters: [],
    items: pageItems,
    total: items.length,
    perPage: PER_PAGE,
  }
})
