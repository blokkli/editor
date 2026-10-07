import type { InvitationRow, SandboxRow } from '../../utils/db'

/**
 * The admin page's tables: the sandboxes, newest first, and the invitations.
 */
export default defineEventHandler(() => {
  const database = getDatabase()
  const sandboxes = database
    .prepare('SELECT * FROM sandboxes ORDER BY created DESC LIMIT 500')
    .all() as SandboxRow[]
  const invitations = database
    .prepare('SELECT * FROM invitations ORDER BY created DESC')
    .all() as InvitationRow[]
  return {
    sandboxes: sandboxes.map((sandbox) => ({
      id: sandbox.id,
      url: sandboxUrl(sandbox.id),
      source: sandbox.source,
      premium: sandbox.premium === 1,
      created: sandbox.created,
      lastUse: sandbox.deleted ? null : lastUse(sandbox),
      expires: expires(sandbox),
      deleted: sandbox.deleted,
    })),
    invitations,
  }
})
