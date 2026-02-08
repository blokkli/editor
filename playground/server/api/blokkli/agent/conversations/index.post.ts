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

  const body = await readBody(event)

  if (!body || !body.uuid) {
    throw createError({
      statusCode: 400,
      message: 'Conversation data with uuid is required',
    })
  }

  const storage = useAgentConversationStorage()
  const key = conversationKey(entityType, entityUuid, body.uuid)
  const now = new Date().toISOString()

  const existing = await storage.getItem(key)
  const createdAt =
    existing && typeof existing === 'object' && 'createdAt' in existing
      ? (existing as { createdAt: string }).createdAt
      : now

  await storage.setItem(key, {
    ...body,
    createdAt,
    updatedAt: now,
  })

  return true
})
