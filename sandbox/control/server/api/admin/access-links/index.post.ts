import type { SandboxRow } from '../../../utils/db'

/**
 * A new access link to a premium sandbox that's still there, for one of its
 * test users.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<{
    sandbox?: unknown
    user?: unknown
    note?: unknown
  }>(event)
  const sandbox =
    typeof body?.sandbox === 'string'
      ? (getDatabase()
          .prepare('SELECT * FROM sandboxes WHERE id = ?')
          .get(body.sandbox) as SandboxRow | undefined)
      : undefined
  if (
    !sandbox ||
    !sandbox.premium ||
    sandbox.deleted ||
    !sandboxExists(sandbox.id)
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No such premium sandbox',
    })
  }
  if (!isTestUser(body.user)) {
    throw createError({ statusCode: 400, statusMessage: 'No such user' })
  }
  const note = typeof body.note === 'string' ? body.note.trim() : ''
  return { token: insertAccessLink(sandbox.id, body.user, note) }
})
