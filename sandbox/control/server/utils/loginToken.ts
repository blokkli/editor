import { createHmac } from 'node:crypto'

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
