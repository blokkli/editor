/**
 * A chunk of text extracted from a field value.
 */
export type TextChunk = {
  text: string
  html?: string
}

/**
 * Block-level HTML element tag names.
 * Same set used by collectTextElements.ts for DOM-based analysis.
 */
const BLOCK_ELEMENTS = new Set([
  'ADDRESS',
  'ARTICLE',
  'ASIDE',
  'BLOCKQUOTE',
  'DD',
  'DIV',
  'DL',
  'DT',
  'FIELDSET',
  'FIGCAPTION',
  'FIGURE',
  'FOOTER',
  'FORM',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'HEADER',
  'HR',
  'LI',
  'MAIN',
  'NAV',
  'OL',
  'P',
  'PRE',
  'SECTION',
  'TABLE',
  'TD',
  'TH',
  'UL',
  'DETAILS',
  'SUMMARY',
  'DIALOG',
])

function isBlockElement(el: Element): boolean {
  return BLOCK_ELEMENTS.has(el.tagName)
}

function containsBlockElements(el: Element): boolean {
  for (const child of el.children) {
    if (isBlockElement(child)) {
      return true
    }
    if (containsBlockElements(child)) {
      return true
    }
  }
  return false
}

function traverse(el: Element, results: TextChunk[]): void {
  if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') {
    return
  }

  if (isBlockElement(el)) {
    if (!containsBlockElements(el)) {
      const text = (el.textContent || '').trim()
      if (text) {
        results.push({
          text,
          html: (el as HTMLElement).innerHTML,
        })
      }
    } else {
      for (const child of el.children) {
        traverse(child, results)
      }
    }
  } else {
    for (const child of el.children) {
      traverse(child, results)
    }
  }
}

/**
 * Split a field value into text chunks for readability analysis.
 *
 * - Plain fields produce a single chunk (the raw text).
 * - Markup fields are parsed as HTML; each leaf block-level element becomes
 *   a separate chunk with both plain text and the inner HTML preserved.
 */
export function chunkHtml(
  value: string,
  fieldType: 'plain' | 'markup',
): TextChunk[] {
  const trimmed = value.trim()
  if (!trimmed) {
    return []
  }

  if (fieldType === 'plain') {
    return [{ text: trimmed }]
  }

  const parser = new DOMParser()
  const doc = parser.parseFromString(trimmed, 'text/html')
  const results: TextChunk[] = []

  // The parsed body may contain top-level block elements or just inline text.
  // Traverse the body's children to find leaf block elements.
  for (const child of doc.body.children) {
    traverse(child, results)
  }

  // If no block elements were found (e.g. "<strong>hello</strong>"),
  // treat the entire body as a single chunk.
  if (results.length === 0) {
    const text = (doc.body.textContent || '').trim()
    if (text) {
      results.push({ text, html: doc.body.innerHTML })
    }
  }

  return results
}
