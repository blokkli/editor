import { Session } from './Session'
import type { ServerToolMetadata } from '../shared/types'
import { validateToken, TOKEN_EXPIRY_SECONDS } from './helpers'

const SESSION_IDLE_TIMEOUT_MS = 5 * 60 * 1000

export class SessionManager {
  private sessions = new Map<
    string,
    { session: Session; lastActivity: number }
  >()
  /** Maps used token strings to their embedded timestamp (seconds). */
  private usedTokens = new Map<string, number>()
  private pruneTimer = setInterval(() => {
    this.pruneIdleSessions()
    this.pruneTokens()
  }, 60_000)

  constructor(private toolDefinitions: ServerToolMetadata[]) {}

  create(peerId: string): Session {
    const session = new Session(this.toolDefinitions)
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
    if (!token || !validateToken(token, authSecret)) return false

    // Reject reused tokens (replay protection layered on the shared validator).
    this.pruneTokens()
    if (this.usedTokens.has(token)) return false
    const timestamp = parseInt(token.substring(0, token.indexOf(':')), 10)
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
