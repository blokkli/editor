import { isLanguage } from '../../../frontend/shared/utils/languages'

/**
 * A used invitation logs in to its sandbox again, through its access link
 * (server/routes/access/[token].get.ts), instead of offering a claim that
 * fails. The access link answers for a sandbox that's gone.
 */
export default defineEventHandler((event) => {
  const { pathname } = getRequestURL(event)
  const { invitation } = getQuery(event)
  if (
    event.method !== 'GET' ||
    typeof invitation !== 'string' ||
    !(pathname === '/' || isLanguage(pathname.slice(1)))
  ) {
    return
  }
  const token = invitationAccessToken(getDatabase(), invitation)
  if (token) {
    setResponseHeader(event, 'Cache-Control', 'no-store')
    return sendRedirect(event, `/access/${encodeURIComponent(token)}`)
  }
})
