export default defineEventHandler<Promise<boolean>>(async (event) => {
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

  const body = await readBody(event)
  if (!body || !body.itemId || !body.rating) {
    throw createError({
      statusCode: 400,
      message: 'itemId and rating are required',
    })
  }

  const storage = useAgentConversationStorage()
  const key = conversationKey(entityType, entityUuid, id)
  const data = await storage.getItem(key)

  if (!data || typeof data !== 'object') {
    throw createError({ statusCode: 404, message: 'Conversation not found' })
  }

  const conv = data as Record<string, unknown>

  // Upsert: replace existing feedback for same itemId, or add new
  const feedback = Array.isArray(conv.feedback) ? [...conv.feedback] : []
  const existing = feedback.findIndex(
    (f: { itemId: string }) => f.itemId === body.itemId,
  )

  const entry = {
    itemId: body.itemId as string,
    rating: body.rating as string,
    explanation: (body.explanation as string) || undefined,
  }

  if (existing >= 0) {
    feedback[existing] = entry
  } else {
    feedback.push(entry)
  }

  conv.feedback = feedback
  conv.feedbackItemIds = feedback.map((f: { itemId: string }) => f.itemId)
  await storage.setItem(key, conv)

  return true
})
