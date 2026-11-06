/**
 * A used invitation logs in to its sandbox again, through its access link,
 * instead of offering a claim that fails. Errors (sandbox gone, link revoked)
 * show the claim page in the invitation's language.
 *
 * nginx doesn't log requests with an invitation: the query is the credential.
 */
export default defineEventHandler((event) => {
  const { invitation } = getQuery(event)
  if (event.method !== 'GET' || typeof invitation !== 'string') {
    return
  }
  const language = claimPageLanguage(
    getRequestURL(event).pathname,
    getRequestHeader(event, 'accept-language'),
  )
  const token = language && invitationAccessToken(getDatabase(), invitation)
  if (token) {
    return openAccessLink(event, token, language)
  }
})
