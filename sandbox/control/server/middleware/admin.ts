import { createHash, timingSafeEqual } from 'node:crypto'
import {
  createError,
  defineEventHandler,
  getRequestHeader,
  getRequestURL,
  setResponseHeader,
} from 'h3'
import { useRuntimeConfig } from '#imports'

function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest()
}

/**
 * Basic auth for the admin pages and their API: one password, any user name.
 * Without a password, they're open locally and closed when hosted.
 */
export default defineEventHandler((event) => {
  if (!/^\/(?:api\/)?admin(?:\/|$)/.test(getRequestURL(event).pathname)) {
    return
  }
  const { adminPassword } = useRuntimeConfig(event)
  if (!adminPassword) {
    if (process.env.IS_DDEV_HOSTED === 'true') {
      throw createError({
        statusCode: 503,
        statusMessage: 'NUXT_ADMIN_PASSWORD is not set',
      })
    }
    return
  }
  const header = getRequestHeader(event, 'authorization') ?? ''
  const credentials = header.startsWith('Basic ')
    ? Buffer.from(header.slice(6), 'base64').toString()
    : ''
  const password = credentials.slice(credentials.indexOf(':') + 1)
  if (
    !credentials ||
    !timingSafeEqual(digest(password), digest(adminPassword))
  ) {
    setResponseHeader(
      event,
      'WWW-Authenticate',
      'Basic realm="blokkli control"',
    )
    throw createError({ statusCode: 401 })
  }
})
