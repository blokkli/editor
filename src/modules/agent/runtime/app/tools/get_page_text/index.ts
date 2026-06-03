import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'

export const paramsSchema = z.object({})

export const resultSchema = z.object({
  text: z
    .string()
    .describe(
      'The page rendered as Markdown — exactly what the user sees, in reading order',
    ),
  truncated: z
    .boolean()
    .optional()
    .describe('True when the Markdown exceeded the size cap and was cut off'),
})

/** Mirrors the cap in `server/fetch.ts` so the LLM never gets a wall of text. */
const MAX_LENGTH = 50000

/**
 * Subtrees that aren't part of the readable page (hidden, ARIA-hidden, blocks
 * the editor renders muted, and the head-style/script tags that occasionally
 * end up inside a block template).
 */
const STRIP_SELECTOR = [
  '[hidden]',
  '[aria-hidden="true"]',
  '[data-bk-is-muted="true"]',
  'style',
  'script',
].join(', ')

export default defineBlokkliAgentTool({
  name: 'get_page_text',
  description:
    'Get the rendered page as Markdown — exactly what the user sees, in ' +
    'reading order, with headings/lists/tables preserved and content from ' +
    'referenced entities (teasers, etc.) included because it reads from the ' +
    'actual DOM. ALWAYS PREFER this over `get_all_page_content` for any ' +
    'question about page meaning or content ("what does this page say", ' +
    '"summarize the page", "write an intro that matches the content", ' +
    '"translate the page"). Reach for `get_all_page_content` only when you ' +
    'need per-block UUIDs to act on specific blocks.',
  category: 'query',
  lazy: true,
  volatile: true,
  prunedSummary: (r) => `${r.text?.length ?? 0} chars of page text`,
  modes: ['readonly', 'editing', 'translating', 'review'],
  label($t) {
    return $t('aiAgentGetPageTextRunning', 'Reading page content', {
      more: true,
    })
  },
  paramsSchema,
  resultSchema,
  async execute(ctx) {
    const { ui, $t } = ctx.app
    const clone = ui.providerElement.cloneNode(true) as HTMLElement
    for (const el of Array.from(clone.querySelectorAll(STRIP_SELECTOR))) {
      el.remove()
    }

    // Dynamic import keeps turndown out of the base agent bundle for users
    // who never load this tool. Same pattern as the agent's DropHandler.
    const { default: TurndownService } = await import('turndown')
    const turndown = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      bulletListMarker: '-',
    })
    // Filter function (vs a tag array): turndown's `TagName` resolves to
    // `keyof HTMLElementTagNameMap`, which excludes `svg` (it lives in the SVG
    // tag map). Filtering by `nodeName` sidesteps the type narrowing and
    // covers all the decorative wrappers in one pass.
    const REMOVED_TAGS = new Set([
      'SVG',
      'IFRAME',
      'PICTURE',
      'VIDEO',
      'AUDIO',
      'CANVAS',
    ])
    turndown.remove((node) => REMOVED_TAGS.has(node.nodeName))

    let text = turndown.turndown(clone.innerHTML).trim()
    let truncated = false
    if (text.length > MAX_LENGTH) {
      text = text.slice(0, MAX_LENGTH) + '\n\n[TRUNCATED]'
      truncated = true
    }

    return {
      label: $t('aiAgentGetPageTextDone', 'Read page content'),
      result: truncated ? { text, truncated } : { text },
    }
  },
})
