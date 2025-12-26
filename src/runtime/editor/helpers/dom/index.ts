import type { Coord } from '#blokkli/types'

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
      clone.dataset[key] = ''
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

/**
 * Possible values for the MouseEvent.buttons property.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/buttons
 */
export const MOUSE_BUTTONS = Object.freeze({
  /**
   *No button or un-initialized.
   */
  NONE: 0,

  /**
   * Primary button (usually the left button).
   */
  PRIMARY: 1,

  /**
   * Secondary button (usually the right button).
   */
  SECONDARY: 2,

  /**
   * Auxiliary button (usually the mouse wheel button or middle button).
   */
  AUXILIARY: 4,

  /**
   * 4th button (typically the "Browser Back" button).
   */
  FOURTH: 8,

  /**
   * 5th button (typically the "Browser Forward" button).
   */
  FIFTH: 16,
})

/**
 * Possible values for the MouseEvent.button property.
 * (Yes, they are different from the "buttons" property...)
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/button
 */
export const MOUSE_BUTTON = Object.freeze({
  /**
   * Main button, usually the left button or the un-initialized state.
   */
  MAIN: 0,

  /**
   * Auxiliary button, usually the wheel button or the middle button (if present).
   */
  AUXILIARY: 1,

  /**
   * Secondary button, usually the right button.
   */
  SECONDARY: 2,

  /**
   * Fourth button, typically the Browser Back button.
   */
  FOURTH: 3,

  /**
   * Fifth button, typically the Browser Forward button.
   */
  FIFTH: 4,
})

/**
 * Determine the visual background color of an element.
 *
 * If the element defines a background color itself, it will be returned.
 * If the element has no explicit background color, we iterate over the
 * ancestors until we find an element with a background color. If no background
 * color can be determined, a transparent color is returned.
 */
export const realBackgroundColor = (
  el: HTMLElement | SVGElement | null,
): string => {
  const transparent = 'rgba(0, 0, 0, 0)'
  if (!el) return transparent

  const bg = getComputedStyle(el).backgroundColor
  if (bg === transparent || bg === 'transparent') {
    return realBackgroundColor(el.parentElement)
  }

  return bg
}

export function getInteractionCoordinates(e: MouseEvent | TouchEvent): Coord {
  if ('touches' in e) {
    const touch = e.touches[0] || e.changedTouches[0]
    // @todo: Handle possible undefined.
    return {
      x: touch!.clientX,
      y: touch!.clientY,
    }
  }
  return {
    x: e.clientX,
    y: e.clientY,
  }
}
