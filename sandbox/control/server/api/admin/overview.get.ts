import type { AccessLinkRow, InvitationRow, SandboxRow } from '../../utils/db'

/**
 * The admin page's tables: the sandboxes, newest first, with their access
 * links, the invitations, and the test users that access links log in as.
 */
export default defineEventHandler(() => {
  const database = getDatabase()
  const sandboxes = database
    .prepare('SELECT * FROM sandboxes ORDER BY created DESC LIMIT 500')
    .all() as SandboxRow[]
  const invitations = database
    .prepare('SELECT * FROM invitations ORDER BY created DESC')
    .all() as InvitationRow[]
  const accessLinks = database
    .prepare('SELECT * FROM access_links ORDER BY created')
    .all() as AccessLinkRow[]
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
      // The note of the invitation that created it.
      invitationNote: sandbox.invitation
        ? (invitations.find(
            (invitation) => invitation.token === sandbox.invitation,
          )?.note ?? '')
        : null,
      accessLinks: accessLinks
        .filter((link) => link.sandbox === sandbox.id)
        .map((link) => ({
          token: link.token,
          user: link.user,
          note: link.note,
          created: link.created,
          revoked: link.revoked,
          lastUse: link.last_used,
          uses: link.uses,
        })),
    })),
    invitations,
    users: TEST_USERS,
  }
})
