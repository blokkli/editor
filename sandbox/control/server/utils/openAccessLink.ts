import type { H3Event } from 'h3'
import type { Language } from '../../../frontend/shared/utils/languages'
import type { AccessLinkRow, SandboxRow } from './db'

/**
 * Opens an access link: a fresh 5-minute login to its premium sandbox as its
 * test user; Drupal never sees the access link's token. Otherwise, back to the
 * claim page in `language` with `?access=<error>`.
 */
export function openAccessLink(
  event: H3Event,
  token: string,
  language: Language,
) {
  setResponseHeader(event, 'Cache-Control', 'no-store')
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
    return sendRedirect(event, `/${language}?access=${target.error}`)
  }
  database
    .prepare(
      'UPDATE access_links SET uses = uses + 1, last_used = ? WHERE token = ?',
    )
    .run(time, token)
  return sendRedirect(event, target.url)
}
