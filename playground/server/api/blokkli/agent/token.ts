import { createHmac, randomBytes } from 'node:crypto'

export default defineEventHandler(() => {
  const config = useRuntimeConfig()
  const authSecret = config.blokkli?.agent?.authSecret
  if (!authSecret) {
    throw createError({ statusCode: 500, message: 'authSecret not configured' })
  }

  // The nonce keeps two tokens of the same second apart: each is used once.
  const payload = `${Math.floor(Date.now() / 1000)}:${randomBytes(12).toString('base64url')}`
  const hmac = createHmac('sha256', authSecret).update(payload).digest('hex')
  return { token: `${payload}:${hmac}` }
})
