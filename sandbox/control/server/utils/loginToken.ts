import { createHmac } from 'node:crypto'
import type { Language } from '../../../frontend/shared/utils/languages'
import { WELCOME_PATHS } from '../../../frontend/shared/utils/welcome'

/**
 * A token that logs a user into a sandbox, until `expires` (a Unix
 * timestamp). Drupal checks it: blokkli_sandbox's SandboxLoginController.
 */
export function createLoginToken(
  secret: string,
  sandbox: string,
  user: string,
  expires: number,
): string {
  const payload = Buffer.from(
    JSON.stringify({ sandbox, user, expires }),
  ).toString('base64url')
  const signature = createHmac('sha256', secret)
    .update(payload)
    .digest('base64url')
  return `${payload}.${signature}`
}

/**
 * The URL that logs a user into a sandbox and opens the welcome page in the
 * content's language. Its token is good for 5 minutes: only for a redirect.
 * Drupal's login opens the editor; `destination` replaces that (core's
 * RedirectResponseSubscriber).
 */
export function sandboxLoginUrl(options: {
  secret: string
  sandbox: string
  baseUrl: string
  user: string
  source: Language
  time: number
}): string {
  const token = createLoginToken(
    options.secret,
    options.sandbox,
    options.user,
    options.time + 300,
  )
  const destination = encodeURIComponent(WELCOME_PATHS[options.source])
  return `${options.baseUrl}/blokkli-sandbox/login/${token}?destination=${destination}`
}
