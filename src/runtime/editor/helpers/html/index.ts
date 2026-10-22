import createDOMPurify from 'dompurify'
import type { Config, DOMPurify } from 'dompurify'
import { escapeHtml } from '#blokkli/editor/helpers/string'

let inertDocument: Document | null = null

/**
 * Parse markup into a `<div>` of a document without a window, as setting a
 * `<div>`'s `innerHTML` parses it. Nothing in that document is loaded or run:
 * its images aren't fetched, its event handlers never fire.
 *
 * Use it for markup that's read, never shown: a stored value, a paste. Don't
 * move its nodes into the page, where they would load and run.
 */
export function parseHtml(html: string): HTMLDivElement {
  inertDocument ??= document.implementation.createHTMLDocument('')
  const container = inertDocument.createElement('div')
  // eslint-disable-next-line no-restricted-syntax -- the inert document's own element
  container.innerHTML = html
  return container
}

/**
 * What markup may hold once it's sanitised.
 *
 * - `richText`: a formatted field's value, and a diff of one. HTML without
 *   scripts, event handlers, `javascript:` URLs, SVG or MathML; style elements
 *   and forms aren't rich text either. Classes and data attributes stay.
 */
export type SanitizeProfile = 'richText'

const PROFILES: Record<SanitizeProfile, Config> = {
  richText: {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['style', 'form', 'input', 'button', 'select', 'textarea'],
  },
}

// An instance of our own: hooks and settings that a project adds to DOMPurify's
// shared instance don't change what the editor lets through.
let purify: DOMPurify | null = null

/**
 * Remove everything from markup that the profile doesn't allow, before the
 * editor shows it.
 *
 * Use it for what's shown only: a stored or proposed value keeps its markup.
 */
export function sanitizeHtml(html: string, profile: SanitizeProfile): string {
  purify ??= createDOMPurify()
  if (!purify.isSupported) {
    // Without a DOM (no window), DOMPurify would return the markup as it is.
    return escapeHtml(html)
  }
  return purify.sanitize(html, PROFILES[profile])
}
