import { mkdirSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { useRuntimeConfig } from '#imports'

export type SandboxRow = {
  id: string
  // The language of the template: the content's original language.
  source: string
  premium: number
  created: number
  // When the cleanup deleted it, or found it gone.
  deleted: number | null
  // An HMAC of the client's IP, for the per-IP limit. Not for invitations.
  ip_hash: string | null
  invitation: string | null
}

export type InvitationRow = {
  token: string
  note: string
  created: number
  used: number | null
  sandbox: string | null
}

let database: DatabaseSync | undefined

/**
 * The app's database: the sandboxes it created, and the invitations. Times
 * are Unix timestamps. Sandboxes made with drush (dev, E2E) aren't in it.
 *
 * node:sqlite is synchronous: a check and a write without an await between
 * them can't interleave with another request.
 */
export function getDatabase(): DatabaseSync {
  if (!database) {
    const { dataDirectory } = useRuntimeConfig()
    mkdirSync(dataDirectory, { recursive: true })
    database = new DatabaseSync(`${dataDirectory}/control.sqlite`)
    database.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS sandboxes (
        id TEXT PRIMARY KEY,
        source TEXT NOT NULL,
        premium INTEGER NOT NULL,
        created INTEGER NOT NULL,
        deleted INTEGER,
        ip_hash TEXT,
        invitation TEXT
      );
      CREATE TABLE IF NOT EXISTS invitations (
        token TEXT PRIMARY KEY,
        note TEXT NOT NULL,
        created INTEGER NOT NULL,
        used INTEGER,
        sandbox TEXT
      );
    `)
  }
  return database
}

/**
 * The current time, as the database stores it.
 */
export function now(): number {
  return Math.floor(Date.now() / 1000)
}
