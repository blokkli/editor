/**
 * Recursively clone an element and inline its styles.
 */
export function cloneWithInlineStyles(node: Element): Element {
  // Clone the element.
  const clone = node.cloneNode(false) as Element

  // Remove attributes.
  clone.removeAttribute('class')
  clone.removeAttribute('id')
  clone.removeAttribute('name')
  clone.removeAttribute('for')
  clone.removeAttribute('style')

  // Remove all data attributes.
  if (clone instanceof HTMLElement || clone instanceof SVGElement) {
    Object.keys(clone.dataset).forEach((key) => {
      delete clone.dataset[key]
    })
  }

  // Get the computed styles and inline them as a style attribute.
  const computedStyle = getComputedStyle(node)
  for (let i = 0; i < computedStyle.length; i++) {
    const propName = computedStyle[i] as any
    if (clone instanceof HTMLElement || clone instanceof SVGElement) {
      clone.style[propName] = computedStyle.getPropertyValue(propName)
    }
  }

  // Recursively clone and append child nodes.
  Array.from(node.childNodes).forEach((child) => {
    if (child.nodeType === Node.ELEMENT_NODE) {
      // Clone child elements.
      clone.appendChild(cloneWithInlineStyles(child as Element))
    } else if (child.nodeType === Node.TEXT_NODE) {
      // Directly append text nodes.
      clone.appendChild(child.cloneNode(true))
    }
  })

  return clone
}

export function cloneElementWithStyles(
  element: Element,
  isRoot?: boolean,
): string {
  // Create a deep clone of the element with inline styles
  const clonedElement = cloneWithInlineStyles(element)
  if (
    isRoot &&
    (clonedElement instanceof HTMLElement ||
      clonedElement instanceof SVGElement)
  ) {
    clonedElement.style.opacity = '1'
  }

  // Create a temporary container to generate the outer HTML
  const container = document.createElement('div')
  container.appendChild(clonedElement)

  return container.innerHTML
}
