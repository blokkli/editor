import { createHmac } from 'node:crypto'
import { createError, defineEventHandler, getRequestHeader, readBody } from 'h3'
import { useRuntimeConfig } from '#imports'
import { isLanguage } from '../../../frontend/shared/languages'
import { WELCOME_PATHS } from '../../../frontend/shared/welcome'
import { DEFAULT_LANGUAGE, type ClaimError } from '../../shared/claim'
import { clientIp } from '../utils/clientIp'
import { getDatabase, now } from '../utils/db'
import { drush } from '../utils/drush'
import { createLoginToken } from '../utils/loginToken'
import {
  availableSources,
  createSandboxId,
  LIFETIME,
  SANDBOX_USER,
  sandboxUrl,
} from '../utils/sandboxes'
import { verifyTurnstile } from '../utils/turnstile'

function claimError(statusCode: number, code: ClaimError) {
  return createError({ statusCode, data: { code } })
}

/**
 * Creates a sandbox and answers with the URL that logs its visitor in and
 * opens the welcome page, in the claim page's language.
 *
 * With an invitation, a premium sandbox: the invitation is used up, and the
 * checks are skipped. Otherwise, Turnstile, the per-IP limit and the cap on
 * active sandboxes. The row is written before the copy, without an await in
 * between: parallel claims see each other.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const body = await readBody<{
    source?: unknown
    language?: unknown
    turnstile?: unknown
    invitation?: unknown
  }>(event)
  const source = body?.source
  if (!isLanguage(source) || !availableSources().includes(source)) {
    throw claimError(400, 'template')
  }
  const language = isLanguage(body.language) ? body.language : DEFAULT_LANGUAGE
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

  // Only for the redirect that follows. Drupal's login opens the editor;
  // `destination` replaces that (core's RedirectResponseSubscriber).
  const token = createLoginToken(
    config.sandboxLoginSecret,
    id,
    SANDBOX_USER,
    now() + 300,
  )
  const destination = encodeURIComponent(WELCOME_PATHS[language])
  return {
    url: `${sandboxUrl(id)}/blokkli-sandbox/login/${token}?destination=${destination}`,
  }
})
