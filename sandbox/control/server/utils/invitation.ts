import type { DatabaseSync } from 'node:sqlite'

/**
 * The access link of a used invitation: the first of its sandbox, which the
 * claim made (the admin page adds others later). Opening the invitation again
 * logs in through it, so revoking that link ends the invitation's logins too.
 */
export function invitationAccessToken(
  database: DatabaseSync,
  invitation: string,
): string | null {
  const row = database
    .prepare(
      `SELECT access_links.token FROM invitations
       JOIN access_links ON access_links.sandbox = invitations.sandbox
       WHERE invitations.token = ? AND invitations.used IS NOT NULL
       ORDER BY access_links.created, access_links.rowid
       LIMIT 1`,
    )
    .get(invitation)
  return row ? String(row.token) : null
}
