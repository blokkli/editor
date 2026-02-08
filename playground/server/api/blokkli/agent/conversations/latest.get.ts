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

  let latest: Record<string, unknown> | null = null
  let latestUpdatedAt = ''

  for (const key of keys) {
    const data = await storage.getItem(key)
    if (!data || typeof data !== 'object') continue
    const conv = data as Record<string, unknown>
    const updatedAt = conv.updatedAt as string
    if (updatedAt > latestUpdatedAt) {
      latestUpdatedAt = updatedAt
      latest = conv
    }
  }

  return latest
})
