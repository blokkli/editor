import { randomBytes } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'

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
  // The access link its claim made: opening the invitation again logs in
  // through it (server/middleware/invitation.ts).
  access_link: string | null
}

// A link that logs into a premium sandbox again, as often as needed
// (server/routes/access/[token].get.ts).
export type AccessLinkRow = {
  token: string
  sandbox: string
  // The test user's name.
  user: string
  note: string
  created: number
  revoked: number | null
  last_used: number | null
  uses: number
}

let database: DatabaseSync | undefined

/**
 * The app's database: the sandboxes it created, the invitations and the
 * access links. Times are Unix timestamps. Sandboxes made with drush (dev,
 * E2E) aren't in it.
 *
 * node:sqlite is synchronous: a check and a write without an await between
 * them can't interleave with another request.
 */
export function getDatabase(): DatabaseSync {
  if (!database) {
    const { dataDirectory } = useRuntimeConfig()
    mkdirSync(dataDirectory, { recursive: true })
    database = new DatabaseSync(`${dataDirectory}/control.sqlite`)
    database.exec('PRAGMA journal_mode = WAL')
    migrate(database)
  }
  return database
}

/**
 * Creates the tables, and adds what older databases lack.
 */
export function migrate(database: DatabaseSync): void {
  database.exec(`
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
      sandbox TEXT,
      access_link TEXT
    );
    CREATE TABLE IF NOT EXISTS access_links (
      token TEXT PRIMARY KEY,
      sandbox TEXT NOT NULL,
      user TEXT NOT NULL,
      note TEXT NOT NULL,
      created INTEGER NOT NULL,
      revoked INTEGER,
      last_used INTEGER,
      uses INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS access_links_sandbox ON access_links (sandbox);
  `)
  const columns = database.prepare('PRAGMA table_info(invitations)').all()
  if (!columns.some((column) => column.name === 'access_link')) {
    // Claims before the column made their sandbox's first access link.
    database.exec(`
      ALTER TABLE invitations ADD COLUMN access_link TEXT;
      UPDATE invitations SET access_link = (
        SELECT token FROM access_links
        WHERE access_links.sandbox = invitations.sandbox
        ORDER BY created, rowid
        LIMIT 1
      )
      WHERE used IS NOT NULL;
    `)
  }
}

/**
 * A new access link to a sandbox, for one of its test users. Its token is the
 * link: 128 random bits, as an invitation's.
 */
export function insertAccessLink(
  sandbox: string,
  user: string,
  note: string,
): string {
  const token = randomBytes(16).toString('base64url')
  getDatabase()
    .prepare(
      'INSERT INTO access_links (token, sandbox, user, note, created) VALUES (?, ?, ?, ?, ?)',
    )
    .run(token, sandbox, user, note, now())
  return token
}

/**
 * The current time, as the database stores it.
 */
export function now(): number {
  return Math.floor(Date.now() / 1000)
}
