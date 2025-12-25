import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

export default defineEventHandler(async (event) => {
  // Only allow in dev mode
  if (!import.meta.dev) {
    throw createError({
      statusCode: 403,
      message: 'Snapshots can only be saved in dev mode',
    })
  }

  const body = await readBody(event)

  // Validate body has required structure
  if (!body || !body.fields || !body.blocks || !body.libraryItems) {
    throw createError({
      statusCode: 400,
      message: 'Invalid request body',
    })
  }

  const dataPath = resolve(process.cwd(), 'playground/snapshots/data.json')
  const jsonContent = JSON.stringify(body, null, 2)

  await writeFile(dataPath, jsonContent, 'utf-8')

  return { success: true }
})
