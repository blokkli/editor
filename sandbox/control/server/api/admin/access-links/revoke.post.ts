/**
 * Revokes an access link: it leads to the claim page from now on. The token
 * comes in the body, since nginx logs paths. The row stays, as sandboxes and
 * invitations do.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<{ token?: unknown }>(event)
  const token = typeof body?.token === 'string' ? body.token : ''
  getDatabase()
    .prepare(
      'UPDATE access_links SET revoked = ? WHERE token = ? AND revoked IS NULL',
    )
    .run(now(), token)
  return { token }
})
