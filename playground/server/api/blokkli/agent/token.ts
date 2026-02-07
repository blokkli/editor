import { createHmac } from 'node:crypto'

export default defineEventHandler(() => {
  const config = useRuntimeConfig()
  const authSecret = config.blokkli?.agent?.authSecret
  if (!authSecret) {
    throw createError({ statusCode: 500, message: 'authSecret not configured' })
  }

  const timestamp = Math.floor(Date.now() / 1000).toString()
  const hmac = createHmac('sha256', authSecret).update(timestamp).digest('hex')
  return { token: `${timestamp}:${hmac}` }
})
