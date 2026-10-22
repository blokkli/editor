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
