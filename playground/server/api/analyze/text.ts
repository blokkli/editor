import { defineEventHandler, readBody, createError } from 'h3'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function sleep(duration: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve()
    }, duration)
  })
}

export default defineEventHandler<Promise<any>>(async (event) => {
  const body = await readBody(event)

  if (!Array.isArray(body.texts)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid request body',
    })
  }

  const texts: Array<{ text: string; index: number }> = body.texts

  // Filter texts that contain 'blokkli' but not 'paragraphs_blokkli'
  const matches = texts
    .filter(
      (v) =>
        v.text.includes('blokkli') && !v.text.includes('paragraphs_blokkli'),
    )
    .map((v) => v.index)

  // Simulate a long request.
  // await sleep(2000)

  return {
    matches,
  }
})
