import { createError, defineEventHandler, readBody } from 'h3'
import { compileComposition } from '../compile'

/**
 * Compiles a composition's source. Whatever the source holds, the answer is
 * safe to render: the browser never gets CSS that this didn't check. So the
 * route can take any source, also one that didn't come from Drupal.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<{ source?: unknown }>(event)
  if (typeof body?.source !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'source is missing' })
  }
  return compileComposition(body.source)
})
