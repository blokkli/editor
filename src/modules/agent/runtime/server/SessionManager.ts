import { createHmac, timingSafeEqual } from 'node:crypto'
import { Session } from './Session'

const TOKEN_EXPIRY_SECONDS = 300
const SESSION_IDLE_TIMEOUT_MS = 5 * 60 * 1000

export class SessionManager {
  private sessions = new Map<string, { session: Session; lastActivity: number }>()
  /** Maps used token strings to their embedded timestamp (seconds). */
  private usedTokens = new Map<string, number>()
  private pruneTimer: ReturnType<typeof setInterval> | null = null
  private onIdleClose?: (peerId: string) => void

  /**
   * Start periodic pruning of idle sessions.
   * The callback is invoked for each peer whose session is removed,
   * so the caller can close the underlying WebSocket connection.
   */
  startPruning(onIdleClose: (peerId: string) => void): void {
    this.onIdleClose = onIdleClose
    this.pruneTimer = setInterval(() => {
      this.pruneIdleSessions()
      this.pruneTokens()
    }, 60_000)
  }

  stopPruning(): void {
    if (this.pruneTimer) {
      clearInterval(this.pruneTimer)
      this.pruneTimer = null
    }
  }

  create(peerId: string): Session {
    const session = new Session()
    this.sessions.set(peerId, { session, lastActivity: Date.now() })
    return session
  }

  get(peerId: string): Session | undefined {
    return this.sessions.get(peerId)?.session
  }

  /**
   * Record activity for a peer to prevent idle timeout.
   */
  touch(peerId: string): void {
    const entry = this.sessions.get(peerId)
    if (entry) {
      entry.lastActivity = Date.now()
    }
  }

  /**
   * Validate an auth token and consume it so it cannot be reused.
   * Returns true only if the token is valid, not expired, and not previously used.
   */
  authenticate(token: string | undefined, authSecret: string): boolean {
    if (!token) return false

    const colonIndex = token.indexOf(':')
    if (colonIndex === -1) return false

    const timestampStr = token.substring(0, colonIndex)
    const providedHmac = token.substring(colonIndex + 1)

    const timestamp = parseInt(timestampStr, 10)
    if (isNaN(timestamp)) return false

    const now = Math.floor(Date.now() / 1000)
    if (Math.abs(now - timestamp) > TOKEN_EXPIRY_SECONDS) return false

    const expectedHmac = createHmac('sha256', authSecret)
      .update(timestampStr)
      .digest('hex')

    if (providedHmac.length !== expectedHmac.length) return false

    const valid = timingSafeEqual(
      Buffer.from(providedHmac, 'hex'),
      Buffer.from(expectedHmac, 'hex'),
    )
    if (!valid) return false

    // Reject reused tokens.
    this.pruneTokens()
    if (this.usedTokens.has(token)) return false
    this.usedTokens.set(token, timestamp)

    return true
  }

  cleanup(peerId: string): void {
    const entry = this.sessions.get(peerId)
    if (entry) {
      entry.session.cleanup()
      this.sessions.delete(peerId)
    }
  }

  private pruneIdleSessions(): void {
    const cutoff = Date.now() - SESSION_IDLE_TIMEOUT_MS
    for (const [peerId, entry] of this.sessions) {
      if (entry.lastActivity < cutoff) {
        entry.session.cleanup()
        this.sessions.delete(peerId)
        this.onIdleClose?.(peerId)
      }
    }
  }

  private pruneTokens(): void {
    const cutoff = Math.floor(Date.now() / 1000) - TOKEN_EXPIRY_SECONDS
    for (const [token, timestamp] of this.usedTokens) {
      if (timestamp < cutoff) {
        this.usedTokens.delete(token)
      }
    }
  }
}
