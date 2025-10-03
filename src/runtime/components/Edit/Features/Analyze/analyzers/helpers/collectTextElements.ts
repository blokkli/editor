export interface TextElement {
  text: string
  element: HTMLElement
}

const blockElements = new Set([
  'ADDRESS',
  'ARTICLE',
  'ASIDE',
  'BLOCKQUOTE',
  'CANVAS',
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

// Helper function to check if an element is a block element
const isBlockElement = (element: Element): boolean => {
  if (blockElements.has(element.tagName.toUpperCase())) {
    return true
  }

  // Check if <a> elements are styled as block elements
  if (element.tagName.toUpperCase() === 'A' && element instanceof HTMLElement) {
    const display = window.getComputedStyle(element).display
    // Consider block, flex, or grid as block elements (but not inline-block, inline-flex, inline-grid)
    return display === 'block' || display === 'flex' || display === 'grid'
  }

  return false
}

// Helper function to check if a block element contains other block elements
const containsBlockElements = (element: HTMLElement): boolean => {
  for (const child of element.children) {
    if (isBlockElement(child)) {
      return true
    }
    // Recursively check descendants
    if (child instanceof HTMLElement && containsBlockElements(child)) {
      return true
    }
  }
  return false
}

// Helper function to get clean text from an element
const getCleanText = (element: HTMLElement): string => {
  return element.textContent?.trim() || ''
}

// Recursive function to find all relevant text blocks
const traverse = (element: HTMLElement, results: TextElement[]) => {
  // Skip script and style elements
  if (element.tagName === 'SCRIPT' || element.tagName === 'STYLE') {
    return
  }

  if (isBlockElement(element)) {
    // If this block element doesn't contain other blocks, collect its text
    if (!containsBlockElements(element)) {
      const text = getCleanText(element)
      if (text) {
        results.push({
          text: text,
          element: element,
        })
      }
    } else {
      // If it contains other blocks, traverse its children
      for (const child of element.children) {
        if (child instanceof HTMLElement) {
          traverse(child, results)
        }
      }
    }
  } else {
    // For inline elements, continue traversing
    for (const child of element.children) {
      if (child instanceof HTMLElement) {
        traverse(child, results)
      }
    }
  }
}

export function collectTextElements(rootElement: HTMLElement): TextElement[] {
  const results: TextElement[] = []
  traverse(rootElement, results)
  return results
}
