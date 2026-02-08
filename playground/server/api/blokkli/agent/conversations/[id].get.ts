export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const query = getQuery(event)
  const entityType = query.entityType as string
  const entityUuid = query.entityUuid as string

  if (!entityType || !entityUuid || !id) {
    throw createError({
      statusCode: 400,
      message: 'entityType, entityUuid, and id are required',
    })
  }

  const storage = useAgentConversationStorage()
  const key = conversationKey(entityType, entityUuid, id)
  const data = await storage.getItem(key)

  if (!data) {
    return null
  }

  return data
})
