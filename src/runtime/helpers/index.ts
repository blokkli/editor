import type { Coord } from '#blokkli/types'

/**
 * Type check for falsy values.
 *
 * Used as the callback for array.filter, e.g.
 * items.filter(falsy)
 */
export function falsy<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined
}

export function onlyUnique(value: string, index: number, self: Array<string>) {
  return self.indexOf(value) === index
}

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

export const lerp = (s: number, e: number, t: number) => s * (1 - t) + e * t

export const getNumericStyleValue = (str: string, fallback = 0): number => {
  const v = str.replace('px', '')
  const num = Number.parseFloat(v)
  if (Number.isNaN(num) || num === 0) {
    return fallback
  }
  return num
}

export const originatesFromTextInput = (e: Event): boolean =>
  e.target instanceof HTMLInputElement ||
  e.target instanceof HTMLTextAreaElement

export function getFieldKey(uuid: string, fieldName: string) {
  return uuid + ':' + fieldName
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
