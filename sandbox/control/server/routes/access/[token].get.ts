import type { AccessLinkRow, SandboxRow } from '../../utils/db'

/**
 * An access link: logs into its premium sandbox as its test user, as often as
 * needed, until it's revoked or the sandbox is gone. A fresh 5-minute login
 * each time; Drupal never sees the access link's token. Otherwise, back to the
 * claim page with `?access=<error>`, in the browser's language.
 *
 * nginx doesn't log these requests: the path is the credential.
 */
export default defineEventHandler((event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  const token = getRouterParam(event, 'token') ?? ''
  const database = getDatabase()
  const link = database
    .prepare('SELECT * FROM access_links WHERE token = ?')
    .get(token) as AccessLinkRow | undefined
  const sandbox = link
    ? (database
        .prepare('SELECT * FROM sandboxes WHERE id = ?')
        .get(link.sandbox) as SandboxRow | undefined)
    : undefined
  const time = now()
  const target = accessLinkTarget({
    link,
    sandbox,
    exists: !!sandbox && sandboxExists(sandbox.id),
    baseUrl: sandbox ? sandboxUrl(sandbox.id) : '',
    secret: useRuntimeConfig(event).sandboxLoginSecret,
    time,
  })
  if ('error' in target) {
    const language = preferredLanguage(
      getRequestHeader(event, 'accept-language'),
    )
    return sendRedirect(event, `/${language}?access=${target.error}`)
  }
  database
    .prepare(
      'UPDATE access_links SET uses = uses + 1, last_used = ? WHERE token = ?',
    )
    .run(time, token)
  return sendRedirect(event, target.url)
})
