import { createHmac, timingSafeEqual } from 'node:crypto'
import type { ConversationStateSnapshot, GenericMessage } from '../../shared/types'

/**
 * HMAC-based verification: agent auth tokens (WebSocket handshake) and
 * conversation-state tamper detection. Both fail closed on a missing secret.
 */

/** Seconds an agent auth token remains valid after issuance. */
export const TOKEN_EXPIRY_SECONDS = 300

/**
 * Validate an HMAC auth token: well-formed `<timestamp>:<hmac>`, not expired,
 * and HMAC matches. Does NOT track one-time use — `SessionManager` layers its
 * replay check on top. Returns false (never throws) on any malformed input.
 */
export function validateToken(token: string, secret: string): boolean {
  if (!secret || !token) return false

  const colonIndex = token.indexOf(':')
  if (colonIndex === -1) return false

  const timestampStr = token.substring(0, colonIndex)
  const providedHmac = token.substring(colonIndex + 1)

  const timestamp = parseInt(timestampStr, 10)
  if (isNaN(timestamp)) return false

  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - timestamp) > TOKEN_EXPIRY_SECONDS) return false

  const expectedHmac = createHmac('sha256', secret)
    .update(timestampStr)
    .digest('hex')

  if (providedHmac.length !== expectedHmac.length) return false

  try {
    return timingSafeEqual(
      Buffer.from(providedHmac, 'hex'),
      Buffer.from(expectedHmac, 'hex'),
    )
  } catch {
    return false
  }
}

/**
 * Compute an HMAC-SHA256 hash for a conversation state snapshot.
 */
export function computeStateHash(
  messages: GenericMessage[],
  activatedLazyTools: string[],
  secret: string,
): string {
  const payload =
    JSON.stringify(messages) + '|' + JSON.stringify(activatedLazyTools)
  return createHmac('sha256', secret).update(payload).digest('hex')
}

/**
 * Verify the HMAC hash of a conversation state snapshot.
 * Uses timing-safe comparison to prevent timing attacks.
 */
export function verifyStateHash(
  snapshot: ConversationStateSnapshot,
  secret: string,
): boolean {
  // Fail closed when no secret is configured. An empty secret still produces a
  // deterministic HMAC that the client could reproduce, so without this guard
  // forged conversation state would verify. Mirrors the auth-token path, which
  // also rejects on `!authSecret`.
  if (!secret) return false

  const expected = computeStateHash(
    snapshot.messages,
    snapshot.activatedLazyTools,
    secret,
  )
  if (expected.length !== snapshot.hash.length) return false
  try {
    return timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(snapshot.hash, 'hex'),
    )
  } catch {
    return false
  }
}
