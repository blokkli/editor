/**
 * What a URL is for.
 *
 * - `link`: a link's `href`. Web pages and email addresses.
 * - `frame`: an iframe's `src`. Web pages only.
 */
export type UrlUse = 'link' | 'frame'

const PROTOCOLS: Record<UrlUse, string[]> = {
  link: ['http:', 'https:', 'mailto:'],
  frame: ['http:', 'https:'],
}

/**
 * Whether a URL from content only leads somewhere when it's followed or
 * loaded: a `javascript:` URL, for example, runs instead.
 *
 * The browser's URL parser reads the protocol as the browser does, with any
 * case and whitespace in it. A relative URL has the page's protocol: it's
 * resolved against the page's address, not the document's base URL, which a
 * `<base>` element can change.
 */
export function isSafeUrl(url: string, use: UrlUse = 'link'): boolean {
  try {
    return PROTOCOLS[use].includes(new URL(url, window.location.href).protocol)
  } catch {
    return false
  }
}

/**
 * The origin of a URL, resolved against the page's address.
 *
 * Null if the URL can't be parsed or its origin is opaque, as a `data:` URL's
 * is: an opaque origin is serialised as "null" and can't be told apart from
 * another.
 */
export function getUrlOrigin(url: string): string | null {
  try {
    const { origin } = new URL(url, window.location.href)
    return origin === 'null' ? null : origin
  } catch {
    return null
  }
}
