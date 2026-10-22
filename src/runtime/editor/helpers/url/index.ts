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
