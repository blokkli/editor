import { createHmac } from 'node:crypto'
import { isLanguage } from '../../../frontend/shared/utils/languages'
import type { ClaimError } from '../../shared/utils/claim'

function claimError(statusCode: number, code: ClaimError) {
  return createError({ statusCode, data: { code } })
}

/**
 * Creates a sandbox and answers with the URL that logs its visitor in and
 * opens the welcome page, in the content's language (the claim page's).
 *
 * With an invitation, a premium sandbox: the invitation is used up, the checks
 * are skipped, and the sandbox gets an access link. Otherwise, Turnstile, the per-IP limit and the cap on
 * active sandboxes. The row is written before the copy, without an await in
 * between: parallel claims see each other.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const body = await readBody<{
    source?: unknown
    turnstile?: unknown
    invitation?: unknown
  }>(event)
  const source = body?.source
  if (!isLanguage(source) || !availableSources().includes(source)) {
    throw claimError(400, 'template')
  }
  const invitation =
    typeof body.invitation === 'string' && body.invitation
      ? body.invitation
      : null
  const ip = clientIp(
    getRequestHeader(event, 'x-forwarded-for'),
    event.node.req.socket.remoteAddress,
  )

  if (!invitation && config.turnstileSecretKey) {
    const response = typeof body.turnstile === 'string' ? body.turnstile : ''
    if (!(await verifyTurnstile(config.turnstileSecretKey, response, ip))) {
      throw claimError(403, 'turnstile')
    }
  }

  const database = getDatabase()
  const id = createSandboxId()
  const created = now()
  let ipHash: string | null = null
  if (invitation) {
    const result = database
      .prepare(
        'UPDATE invitations SET used = ?, sandbox = ? WHERE token = ? AND used IS NULL',
      )
      .run(created, id, invitation)
    if (result.changes !== 1) {
      throw claimError(410, 'invitation')
    }
  } else {
    ipHash = createHmac('sha256', config.sandboxLoginSecret)
      .update(ip)
      .digest('hex')
    const recent = database
      .prepare(
        'SELECT count(*) AS count FROM sandboxes WHERE ip_hash = ? AND created > ?',
      )
      .get(ipHash, created - 3600)
    if (Number(recent?.count) >= config.claimsPerIpPerHour) {
      throw claimError(429, 'rate_limit')
    }
    const active = database
      .prepare(
        'SELECT count(*) AS count FROM sandboxes WHERE premium = 0 AND deleted IS NULL',
      )
      .get()
    if (Number(active?.count) >= config.maxActiveSandboxes) {
      throw claimError(503, 'full')
    }
  }
  database
    .prepare(
      'INSERT INTO sandboxes (id, source, premium, created, ip_hash, invitation) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .run(id, source, invitation ? 1 : 0, created, ipHash, invitation)

  // The limits that expires() applies, for the sandbox's banner. Only a
  // premium sandbox gets the agent.
  const options = invitation
    ? ['--premium', `--expires=${created + LIFETIME.premium}`]
    : [`--expires=${created + LIFETIME.normal}`, `--idle=${LIFETIME.idle}`]
  try {
    await drush('blokkli-sandbox:create', id, `--source=${source}`, ...options)
  } catch (error) {
    console.error(`Couldn't create the sandbox ${id}:`, error)
    database.prepare('DELETE FROM sandboxes WHERE id = ?').run(id)
    if (invitation) {
      database
        .prepare(
          'UPDATE invitations SET used = NULL, sandbox = NULL WHERE token = ?',
        )
        .run(invitation)
    }
    throw claimError(500, 'failed')
  }

  // Every premium sandbox gets an access link: the admin page hands it out, to
  // come back and for colleagues, and the invitation logs in through it again.
  if (invitation) {
    const row = database
      .prepare('SELECT note FROM invitations WHERE token = ?')
      .get(invitation)
    const accessLink = insertAccessLink(
      id,
      SANDBOX_USER,
      String(row?.note ?? ''),
    )
    database
      .prepare('UPDATE invitations SET access_link = ? WHERE token = ?')
      .run(accessLink, invitation)
  }

  return {
    url: sandboxLoginUrl({
      secret: config.sandboxLoginSecret,
      sandbox: id,
      baseUrl: sandboxUrl(id),
      user: SANDBOX_USER,
      source,
      time: now(),
    }),
  }
})
