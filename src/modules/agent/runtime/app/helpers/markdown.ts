import { marked } from 'marked'
import { sanitizeHtml } from '#blokkli/editor/helpers/html'

/** Shared marked options for all agent markdown rendering. */
export const markedOptions = { gfm: true, breaks: true } as const

/**
 * Render markdown to an HTML string using the shared options, sanitised.
 *
 * marked passes raw HTML through, and the markdown is the model's or a user's.
 * The block chips of `linkifyBlockUuids()` are raw HTML too, which the
 * sanitiser keeps.
 */
export function renderMarkdown(content: string): string {
  return sanitizeHtml(
    marked.parse(content, markedOptions) as string,
    'markdown',
  )
}
