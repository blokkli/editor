import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import { readBlockContentFields } from '../helpers'
import { itemEntityType } from '#blokkli-build/config'

export const paramsSchema = z.object({
  query: z
    .string()
    .describe(
      'The text to search for. For regex, use JavaScript regex literal format: /pattern/flags (e.g., "/hello|world/gi" to match either word case-insensitively). Plain text is matched case-insensitively by default.',
    ),
  bundle: z
    .string()
    .optional()
    .describe('Optional: only search in paragraphs of this bundle type'),
  limit: z.coerce
    .number()
    .optional()
    .default(20)
    .describe('Maximum number of results to return (default: 20)'),
})

export const resultSchema = z.object({
  matches: z.array(
    z.object({
      uuid: z.string().describe('The paragraph UUID'),
      bundle: z.string().describe('The paragraph type'),
      matchedText: z.string().describe('The text snippet containing the match'),
      matchCount: z
        .number()
        .describe('Number of times the query appears in this paragraph'),
      source: z
        .enum(['field', 'rendered'])
        .describe(
          '"field": the match is in an editable field and `matchedText` is the STORED value — safe to reuse as a search/replace target. "rendered": the match is only in the rendered page (content the backend generated, or a component that loads its own data), so `matchedText` may not exist in any field and MUST NOT be used as an edit target.',
        ),
      fieldName: z
        .string()
        .optional()
        .describe(
          'The editable field the snippet came from. Present only when source is "field".',
        ),
    }),
  ),
  totalMatches: z.number().describe('Total number of paragraphs that matched'),
})

export default defineBlokkliAgentTool({
  name: 'search_text',
  description:
    'Search for text in paragraph content. Returns paragraphs containing matches with text snippets. Only searches text directly in each paragraph, not in nested child paragraphs. For regex, use /pattern/flags format (e.g., "/hello|world/gi").\nSearches editable field values first and falls back to the rendered page, so it also finds text no field holds. Check `source` on each match before acting: "field" snippets are stored values you can reuse as edit targets, "rendered" snippets are display-only and may not exist in any field.',
  category: 'query',
  volatile: true,
  lazy: true,
  prunedSummary: (r) => `${r.totalMatches || 0} paragraphs matched`,
  modes: ['readonly', 'editing', 'translating', 'review'],
  label($t) {
    return $t('aiAgentSearchTextRunning', 'Searching text', { more: true })
  },
  paramsSchema,
  resultSchema,
  execute(ctx, params) {
    const { blocks, dom, element, $t } = ctx.app
    const limit = params.limit ?? 20

    // Check if query is a regex literal (e.g., /pattern/flags)
    const regexLiteralMatch = params.query.match(/^\/(.+)\/([gimsuy]*)$/)

    // Build search regex
    let regex: RegExp
    try {
      if (regexLiteralMatch && regexLiteralMatch[1]) {
        // Parse regex literal format
        const pattern = regexLiteralMatch[1]
        const flags = regexLiteralMatch[2] || 'gi'
        regex = new RegExp(pattern, flags)
      } else {
        // Plain text search: escape special characters, case-insensitive
        const escapedQuery = params.query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        regex = new RegExp(escapedQuery, 'gi')
      }
    } catch {
      // Return error for invalid regex
      return {
        label: $t('aiAgentSearchTextError', 'Invalid regex pattern'),
        result: {
          matches: [],
          totalMatches: 0,
        },
      }
    }

    /**
     * Extract text from a block element, excluding text from nested blocks.
     * Each rendered block wrapper carries `data-bk-uuid` (set by DraggableList);
     * `querySelectorAll` only returns descendants, so the block's own wrapper
     * (the clone root) is preserved while every nested block subtree is dropped.
     */
    const getBlockOwnText = (el?: HTMLElement): string => {
      if (!el) return ''

      // Clone the element to avoid modifying the actual DOM
      const clone = el.cloneNode(true) as HTMLElement

      // Remove all nested block elements (their wrappers carry data-bk-uuid)
      const nestedBlocks = clone.querySelectorAll('[data-bk-uuid]')
      nestedBlocks.forEach((nested) => nested.remove())

      // Get alt/title text from images (only from non-nested content)
      const altTexts = element
        .queryAll(clone, 'img', 'searchTextAlt', (img) => {
          if (img instanceof HTMLImageElement) {
            return [img.alt, img.title].filter(Boolean).join(' ')
          }
        })
        .join(' ')

      return ((clone.textContent ?? '') + ' ' + altTexts).trim()
    }

    /**
     * Extract a snippet around the first match.
     */
    const getSnippet = (text: string, maxLength = 150): string => {
      // Use a non-global version of the regex to find first match position
      const searchRegex = new RegExp(regex.source, regex.flags.replace('g', ''))
      const match = text.match(searchRegex)

      if (!match || match.index === undefined) {
        return text.slice(0, maxLength)
      }

      const matchLength = match[0].length
      const start = Math.max(0, match.index - 50)
      const end = Math.min(text.length, match.index + matchLength + 100)

      let snippet = text.slice(start, end).trim()
      if (start > 0) snippet = '...' + snippet
      if (end < text.length) snippet = snippet + '...'

      return snippet
    }

    // Search all blocks
    const allBlocks = blocks.getAllBlocks()
    const matches: z.infer<typeof resultSchema>['matches'] = []

    for (const block of allBlocks) {
      // Filter by bundle if specified
      if (params.bundle && block.bundle !== params.bundle) continue

      // Stored values first. A snippet from here is a real substring of the
      // field, so the model can hand it straight back as a search/replace
      // target — which is exactly what it tends to do with these results.
      let storedCount = 0
      let storedField: { fieldName: string; value: string } | undefined
      for (const field of readBlockContentFields(
        ctx.app,
        block.uuid,
        itemEntityType,
        block.bundle,
      )) {
        const hits = field.value.match(regex)
        if (!hits?.length) continue
        storedCount += hits.length
        storedField ??= field
      }

      if (storedField) {
        matches.push({
          uuid: block.uuid,
          bundle: block.bundle,
          matchedText: getSnippet(storedField.value),
          matchCount: storedCount,
          source: 'field',
          fieldName: storedField.fieldName,
        })
        continue
      }

      // Nothing in the fields — fall back to the rendered text. This is what
      // makes the tool find content no field holds (a block that fetches its
      // own data, backend-generated markup), so it stays worth searching; the
      // `source` marker tells the model it cannot edit what it found.
      const el = dom.getDragElement(block)
      const text = getBlockOwnText(el)
      const matchArray = text.match(regex)

      if (matchArray && matchArray.length > 0) {
        matches.push({
          uuid: block.uuid,
          bundle: block.bundle,
          matchedText: getSnippet(text),
          matchCount: matchArray.length,
          source: 'rendered',
        })
      }
    }

    // Sort by match count (most matches first) and limit
    matches.sort((a, b) => b.matchCount - a.matchCount)
    const limitedMatches = matches.slice(0, limit)

    // Only select the block if exactly one match was found
    const affectedUuids = matches.length === 1 ? [matches[0]!.uuid] : undefined

    return {
      label: $t(
        'aiAgentSearchTextDone',
        "Found @count blocks matching '@query'",
      )
        .replace('@count', String(matches.length))
        .replace('@query', params.query),
      result: {
        matches: limitedMatches,
        totalMatches: matches.length,
      },
      affectedUuids,
    }
  },
})
