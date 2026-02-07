import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'

const paramsSchema = z.object({
  url: z.string().url().describe('The URL to fetch content from'),
  format: z
    .enum(['markdown', 'html'])
    .default('markdown')
    .describe(
      'Output format: "markdown" (default) converts HTML to readable Markdown preserving structure, "html" returns cleaned raw HTML',
    ),
})

const resultSchema = z.object({
  content: z
    .string()
    .describe('The page content in the requested format (markdown or html)'),
  title: z.string().describe('The page title'),
  format: z.enum(['markdown', 'html']).describe('The format of the content'),
  url: z
    .string()
    .describe('The final URL (may differ from input if redirected)'),
})

export default defineBlokkliAgentTool({
  name: 'web_fetch',
  description:
    'Fetch and extract content from a web page. Only allowed origins can be fetched. By default returns Markdown which preserves document structure (headings, lists, links). Use format="html" if you need the raw HTML.',
  category: 'query',
  lazy: true,
  modes: ['readonly', 'editing', 'translating', 'review'],
  label($t) {
    return $t('aiAgentWebFetchRunning', 'Fetching web page...')
  },
  paramsSchema,
  resultSchema,
  async execute(ctx, params) {
    const { $t } = ctx.app

    const response = await fetch('/api/blokkli/agent/fetch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: params.url, format: params.format }),
    })

    if (!response.ok) {
      let errorMessage = 'Failed to fetch URL'
      try {
        const errorData = await response.json()
        errorMessage = errorData.message || errorMessage
      } catch {
        // Use default error message
      }
      return { error: errorMessage }
    }

    const result = (await response.json()) as {
      content: string
      title: string
      format: 'markdown' | 'html'
      url: string
    }

    return {
      label: $t('aiAgentWebFetchDone', "Fetched '@title'").replace(
        '@title',
        result.title || params.url,
      ),
      result,
    }
  },
})
