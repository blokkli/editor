import { createError, defineEventHandler, readBody } from 'h3'
import { useRuntimeConfig } from '#imports'
import { allowedFetchOrigins } from '#blokkli-build/agent-server'
import TurndownService from 'turndown'
import { validateToken } from './helpers/security'

/** Redirects followed before giving up. */
const MAX_REDIRECTS = 5

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
 * Throw unless the URL may be fetched: HTTPS, and an allowed origin. Checked
 * for the requested URL and for every redirect.
 */
function assertFetchable(url: URL): void {
  if (url.protocol !== 'https:') {
    throw createError({
      statusCode: 400,
      message: 'Only HTTPS URLs are allowed',
    })
  }

  if (allowedFetchOrigins.length === 0) {
    throw createError({
      statusCode: 403,
      message:
        'No allowed origins configured. Configure allowedFetchOrigins in the agent module options.',
    })
  }

  if (!isOriginAllowed(url)) {
    throw createError({
      statusCode: 403,
      message: `Origin not allowed: ${url.origin}. Allowed origins: ${allowedFetchOrigins.join(', ')}`,
    })
  }
}

/**
 * Fetch a URL, following redirects only to fetchable URLs.
 */
async function fetchFollowingRedirects(
  url: URL,
): Promise<{ response: Response; url: URL }> {
  let current = url
  for (let redirects = 0; ; redirects++) {
    let response: Response
    try {
      response = await fetch(current, {
        redirect: 'manual',
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

    const location = response.headers.get('location')
    if (response.status < 300 || response.status >= 400 || !location) {
      return { response, url: current }
    }
    if (redirects === MAX_REDIRECTS) {
      throw createError({ statusCode: 502, message: 'Too many redirects' })
    }
    current = new URL(location, current)
    assertFetchable(current)
  }
}

/**
 * Extract the title from HTML.
 */
function extractTitle(html: string): string {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  return titleMatch?.[1]?.trim() ?? ''
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
    'canvas',
    'video',
    'audio',
    'iframe',
  ])
  // Turndown's types only name HTML elements.
  turndown.remove((node) => node.nodeName.toLowerCase() === 'svg')

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
  const {
    authToken,
    url,
    format = 'markdown',
  } = body as {
    authToken?: string
    url?: string
    format?: OutputFormat
  }

  // The server fetches for the client: only for clients the backend let in,
  // like the WebSocket and the stream.
  const authSecret = useRuntimeConfig().blokkli?.agent?.authSecret
  if (!authSecret || !authToken || !validateToken(authToken, authSecret)) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
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

  assertFetchable(parsedUrl)

  const { response, url: finalUrl } = await fetchFollowingRedirects(parsedUrl)

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
    url: finalUrl.href, // The final URL in case of redirects
  }
})
