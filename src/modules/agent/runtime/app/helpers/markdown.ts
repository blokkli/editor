import { marked } from 'marked'

/** Shared marked options for all agent markdown rendering. */
export const markedOptions = { gfm: true, breaks: true } as const

/** Render markdown to an HTML string using the shared options. */
export function renderMarkdown(content: string): string {
  return marked.parse(content, markedOptions) as string
}
