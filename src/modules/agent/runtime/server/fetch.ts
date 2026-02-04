import { createError, defineEventHandler, readBody } from '#imports'
import { allowedFetchOrigins } from '#blokkli-build/agent-server-config'
import TurndownService from 'turndown'

type OutputFormat = 'markdown' | 'html'

/**
 * Check if a URL's origin is in the allowlist.
 * Supports exact matches and subdomain matching.
 */
function isOriginAllowed(url: URL): boolean {
  return allowedFetchOrigins.some((allowed) => {
    const allowedUrl = new URL(allowed)
    // Check exact origin match or subdomain match
    return (
      url.origin === allowedUrl.origin ||
      url.hostname === allowedUrl.hostname ||
      url.hostname.endsWith('.' + allowedUrl.hostname)
    )
  })
}

/**
 * Extract the title from HTML.
 */
function extractTitle(html: string): string {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  return titleMatch ? titleMatch[1].trim() : ''
}

/**
 * Clean HTML by removing scripts, styles, and non-content elements.
 * Returns HTML suitable for further processing.
 */
function cleanHtml(html: string): string {
  return (
    html
      // Remove script and style tags and their contents
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '')
      // Remove common non-content elements
      .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
      .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '')
      .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '')
      .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, '')
  )
}

/**
 * Convert HTML to Markdown using Turndown.
 */
function htmlToMarkdown(html: string): string {
  const turndown = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
  })

  // Remove images to reduce noise (optional, can be configured)
  turndown.remove([
    'img',
    'figure',
    'picture',
    'svg',
    'canvas',
    'video',
    'audio',
    'iframe',
  ])

  return turndown.turndown(html)
}

/**
 * Truncate content if too long.
 */
function truncateContent(content: string, maxLength: number = 50000): string {
  if (content.length > maxLength) {
    return content.substring(0, maxLength) + '\n\n... [content truncated]'
  }
  return content
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { url, format = 'markdown' } = body as {
    url?: string
    format?: OutputFormat
  }

  if (!url || typeof url !== 'string') {
    throw createError({
      statusCode: 400,
      message: 'URL is required',
    })
  }

  if (format !== 'markdown' && format !== 'html') {
    throw createError({
      statusCode: 400,
      message: 'Invalid format. Must be "markdown" or "html".',
    })
  }

  // Parse and validate URL
  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch {
    throw createError({
      statusCode: 400,
      message: 'Invalid URL format',
    })
  }

  // Only allow HTTPS
  if (parsedUrl.protocol !== 'https:') {
    throw createError({
      statusCode: 400,
      message: 'Only HTTPS URLs are allowed',
    })
  }

  // Check if any origins are configured
  if (allowedFetchOrigins.length === 0) {
    throw createError({
      statusCode: 403,
      message:
        'No allowed origins configured. Configure allowedFetchOrigins in the agent module options.',
    })
  }

  // Check if origin is allowed
  if (!isOriginAllowed(parsedUrl)) {
    throw createError({
      statusCode: 403,
      message: `Origin not allowed: ${parsedUrl.origin}. Allowed origins: ${allowedFetchOrigins.join(', ')}`,
    })
  }

  // Fetch the URL
  let response: Response
  try {
    response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BlokkliAgent/1.0)',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    })
  } catch (error) {
    throw createError({
      statusCode: 502,
      message: `Failed to fetch URL: ${(error as Error).message}`,
    })
  }

  if (!response.ok) {
    throw createError({
      statusCode: response.status,
      message: `Remote server returned ${response.status}: ${response.statusText}`,
    })
  }

  // Get content type and ensure it's HTML
  const contentType = response.headers.get('content-type') || ''
  if (
    !contentType.includes('text/html') &&
    !contentType.includes('application/xhtml')
  ) {
    throw createError({
      statusCode: 415,
      message: `Unsupported content type: ${contentType}. Only HTML pages are supported.`,
    })
  }

  // Read HTML and extract title
  const html = await response.text()
  const title = extractTitle(html)

  // Clean HTML (remove scripts, styles, nav, etc.)
  const cleanedHtml = cleanHtml(html)

  // Convert to requested format
  let content: string
  if (format === 'markdown') {
    content = htmlToMarkdown(cleanedHtml)
  } else {
    content = cleanedHtml
  }

  // Truncate if too long
  content = truncateContent(content)

  return {
    content,
    title,
    format,
    url: response.url, // Return final URL in case of redirects
  }
})
