import { writeFile, mkdir } from 'node:fs/promises'
import { resolve, extname } from 'node:path'
import { randomUUID } from 'node:crypto'

export default defineEventHandler(async (event) => {
  if (!import.meta.dev) {
    throw createError({
      statusCode: 403,
      message: 'Uploads are only allowed in dev mode',
    })
  }

  const body = await readBody(event)

  if (!body || typeof body.data !== 'string' || typeof body.fileName !== 'string') {
    throw createError({
      statusCode: 400,
      message: 'Missing data or fileName',
    })
  }

  // Extract the base64 content from the data URL.
  const match = body.data.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) {
    throw createError({
      statusCode: 400,
      message: 'Invalid data URL',
    })
  }

  const buffer = Buffer.from(match[2]!, 'base64')
  const ext = extname(body.fileName) || '.png'
  const filename = randomUUID() + ext

  const uploadsDir = resolve(process.cwd(), 'playground/public/uploads')
  await mkdir(uploadsDir, { recursive: true })
  await writeFile(resolve(uploadsDir, filename), buffer)

  return { url: '/uploads/' + filename }
})
