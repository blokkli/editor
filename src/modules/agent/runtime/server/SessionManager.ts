import { Session } from './Session'

class SessionManager {
  private sessions = new Map<string, Session>()

  getOrCreate(peerId: string): Session {
    let session = this.sessions.get(peerId)
    if (!session) {
      session = new Session()
      this.sessions.set(peerId, session)
    }
    return session
  }

  get(peerId: string): Session | undefined {
    return this.sessions.get(peerId)
  }

  cleanup(peerId: string): void {
    const session = this.sessions.get(peerId)
    if (session) {
      session.cleanup()
      this.sessions.delete(peerId)
    }
  }
}

export const sessionManager = new SessionManager()
