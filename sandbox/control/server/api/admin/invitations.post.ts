import { randomBytes } from 'node:crypto'

/**
 * A new invitation: its link creates one premium sandbox.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<{ note?: unknown }>(event)
  const token = randomBytes(16).toString('base64url')
  const note = typeof body?.note === 'string' ? body.note.trim() : ''
  getDatabase()
    .prepare('INSERT INTO invitations (token, note, created) VALUES (?, ?, ?)')
    .run(token, note, now())
  return { token }
})
