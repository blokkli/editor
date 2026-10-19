import { createHash, timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'

function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest()
}

/**
 * Whether a request that changes something comes from another site. Browsers
 * resend cached basic-auth credentials with any request, and readBody() also
 * parses form posts: a page elsewhere could post to the admin API. Browsers
 * send Sec-Fetch-Site, older ones at least Origin; a request without either
 * isn't a browser's (curl), and needs the password anyway.
 */
function isCrossSite(event: H3Event): boolean {
  if (['GET', 'HEAD'].includes(event.method)) {
    return false
  }
  const site = getRequestHeader(event, 'sec-fetch-site')
  if (site) {
    return site !== 'same-origin'
  }
  const origin = getRequestHeader(event, 'origin')
  if (!origin) {
    return false
  }
  try {
    return new URL(origin).host !== getRequestHost(event)
  } catch {
    return true
  }
}

/**
 * Basic auth for the admin pages and their API: one password, any user name.
 * Without a password, they're open locally and closed when hosted. Requests
 * from other sites are refused before.
 */
export default defineEventHandler((event) => {
  if (!/^\/(?:api\/)?admin(?:\/|$)/.test(getRequestURL(event).pathname)) {
    return
  }
  if (isCrossSite(event)) {
    throw createError({ statusCode: 403, statusMessage: 'Cross-site request' })
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
