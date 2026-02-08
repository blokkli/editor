export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const entityType = query.entityType as string
  const entityUuid = query.entityUuid as string

  if (!entityType || !entityUuid) {
    throw createError({
      statusCode: 400,
      message: 'entityType and entityUuid are required',
    })
  }

  const storage = useAgentConversationStorage()
  const prefix = conversationPrefix(entityType, entityUuid)
  const keys = await storage.getKeys(prefix)

  const summaries = await Promise.all(
    keys.map(async (key) => {
      const data = await storage.getItem(key)
      if (!data || typeof data !== 'object') return null
      const conv = data as {
        uuid: string
        title: string
        createdAt: string
        updatedAt: string
      }
      return {
        uuid: conv.uuid,
        title: conv.title,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
      }
    }),
  )

  return summaries.filter(Boolean)
})
