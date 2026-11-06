/**
 * An access link: logs into its premium sandbox as its test user, as often as
 * needed, until it's revoked or the sandbox is gone. Errors show the claim
 * page in the browser's language.
 *
 * nginx doesn't log these requests: the path is the credential.
 */
export default defineEventHandler((event) =>
  openAccessLink(
    event,
    getRouterParam(event, 'token') ?? '',
    preferredLanguage(getRequestHeader(event, 'accept-language')),
  ),
)
