import { easeOutSine } from './easing'
import type { Rectangle, Coord, Size } from '#blokkli/types'
import type { RGB } from '#blokkli/types/theme'

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
 * Convert a date to a relative time string, such as
 * "a minute ago", "in 2 hours", "yesterday", "3 months ago", etc.
 * using Intl.RelativeTimeFormat
 */
export function getRelativeTimeString(
  date: Date | number,
  lang = navigator.language,
): string {
  // Allow dates or times to be passed
  const timeMs = typeof date === 'number' ? date : date.getTime()

  // Get the amount of seconds between the given date and now
  const deltaSeconds = Math.round((timeMs - Date.now()) / 1000)

  // Array reprsenting one minute, hour, day, week, month, etc in seconds
  const cutoffs = [
    60,
    3600,
    86400,
    86400 * 7,
    86400 * 30,
    86400 * 365,
    Infinity,
  ]

  // Array equivalent to the above but in the string representation of the units
  const units: Intl.RelativeTimeFormatUnit[] = [
    'second',
    'minute',
    'hour',
    'day',
    'week',
    'month',
    'year',
  ]

  // Grab the ideal cutoff unit
  const unitIndex = cutoffs.findIndex(
    (cutoff) => cutoff > Math.abs(deltaSeconds),
  )

  // Get the divisor to divide from the seconds. E.g. if our unit is "day" our divisor
  // is one day in seconds, so we can divide our seconds by this to get the # of days
  const divisor = unitIndex ? cutoffs[unitIndex - 1]! : 1

  // Intl.RelativeTimeFormat do its magic
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' })
  return rtf.format(Math.floor(deltaSeconds / divisor), units[unitIndex]!)
}

export function modulo(n: number, m: number) {
  return ((n % m) + m) % m
}

export function getBounds(rects: Rectangle[]): Rectangle | undefined {
  if (!rects.length) {
    return
  }

  const firstRect = rects[0]!
  let minX = firstRect.x
  let minY = firstRect.y
  let maxX = minX + firstRect.width
  let maxY = minY + firstRect.height

  for (const rect of rects.slice(1)) {
    minX = Math.min(minX, rect.x)
    minY = Math.min(minY, rect.y)
    maxX = Math.max(maxX, rect.x + rect.width)
    maxY = Math.max(maxY, rect.y + rect.height)
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

export function intersects(a: Rectangle, b: Rectangle): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  )
}

export function isInsideRect(x: number, y: number, rect: Rectangle): boolean {
  return (
    x > rect.x &&
    x < rect.x + rect.width &&
    y > rect.y &&
    y < rect.y + rect.height
  )
}

/**
 * Calculate the intersection amount of two rectangles as a value from 0 to 1.
 */
export function calculateIntersection(
  rectA: Rectangle,
  rectB: Rectangle,
): number {
  if (!intersects(rectA, rectB)) {
    return 0
  }
  const xOverlap = Math.max(
    0,
    Math.min(rectA.x + rectA.width, rectB.x + rectB.width) -
      Math.max(rectA.x, rectB.x),
  )
  const yOverlap = Math.max(
    0,
    Math.min(rectA.y + rectA.height, rectB.y + rectB.height) -
      Math.max(rectA.y, rectB.y),
  )

  const intersectionArea = xOverlap * yOverlap
  const rectAArea = rectA.width * rectA.height

  return intersectionArea / rectAArea
}

/**
 * Return the closest rectangle.
 */
export function findClosestRectangle<T extends Rectangle>(
  x: number,
  y: number,
  rects: T[],
): T {
  let closestRect: T | undefined = rects[0]
  if (!closestRect) {
    throw new Error('Need at least one rect.')
  }

  let minDistance = distanceToClosestRectangleEdge(x, y, closestRect)

  for (let i = 1; i < rects.length; i++) {
    const rect = rects[i]!
    const distance = distanceToClosestRectangleEdge(x, y, rect)

    if (distance < minDistance) {
      closestRect = rect
      minDistance = distance
    }
  }

  return closestRect
}

/**
 * Return the distance from the given coordinates to the center of the rectangle.
 */
export function distanceToRectangle(
  x: number,
  y: number,
  rect: Rectangle,
): number {
  const minX = rect.x
  const minY = rect.y
  const maxX = rect.x + rect.width
  const maxY = rect.y + rect.height
  const dx = Math.max(minX - x, 0, x - maxX)
  const dy = Math.max(minY - y, 0, y - maxY)
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Return the distance from the given coordinates to the center of the rectangle.
 */
export function distanceToClosestRectangleEdge(
  x: number,
  y: number,
  rect: Rectangle,
): number {
  if (isInsideRect(x, y, rect)) {
    return 0
  }
  const minX = rect.x
  const minY = rect.y
  const maxX = rect.x + rect.width
  const maxY = rect.y + rect.height

  const dx = Math.max(minX - x, 0, x - maxX)
  const dy = Math.max(minY - y, 0, y - maxY)
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Subtracts a rectangle from a viewport and returns the remaining area as rectangles.
 * The viewport is assumed to have x=0 and y=0.
 *
 * @param viewport - The size of the viewport to subtract from
 * @param rect - The rectangle to subtract
 * @returns An array of 0 to 4 rectangles representing the area outside of rect
 */
export function subtractRectFromViewport(
  viewport: Size,
  rect: Rectangle,
): Rectangle[] {
  const viewportLeft = 0
  const viewportTop = 0
  const viewportRight = viewport.width
  const viewportBottom = viewport.height

  const intersectLeft = Math.max(viewportLeft, rect.x)
  const intersectTop = Math.max(viewportTop, rect.y)
  const intersectRight = Math.min(viewportRight, rect.x + rect.width)
  const intersectBottom = Math.min(viewportBottom, rect.y + rect.height)

  // If there's no intersection, return the viewport as a rectangle.
  if (intersectLeft >= intersectRight || intersectTop >= intersectBottom) {
    return [
      {
        x: 0,
        y: 0,
        width: viewport.width,
        height: viewport.height,
      },
    ]
  }

  // Intersection covers the entire viewport.
  if (
    intersectLeft <= viewportLeft &&
    intersectTop <= viewportTop &&
    intersectRight >= viewportRight &&
    intersectBottom >= viewportBottom
  ) {
    return []
  }

  const result: Rectangle[] = []

  // Top rectangle (area above the intersection)
  if (intersectTop > viewportTop) {
    result.push({
      x: viewportLeft,
      y: viewportTop,
      width: viewport.width,
      height: intersectTop - viewportTop,
    })
  }

  // Bottom rectangle (area below the intersection)
  if (intersectBottom < viewportBottom) {
    result.push({
      x: viewportLeft,
      y: intersectBottom,
      width: viewport.width,
      height: viewportBottom - intersectBottom,
    })
  }

  // Left rectangle (area to the left of intersection, between top and bottom)
  if (intersectLeft > viewportLeft) {
    result.push({
      x: viewportLeft,
      y: intersectTop,
      width: intersectLeft - viewportLeft,
      height: intersectBottom - intersectTop,
    })
  }

  // Right rectangle (area to the right of intersection, between top and bottom)
  if (intersectRight < viewportRight) {
    result.push({
      x: intersectRight,
      y: intersectTop,
      width: viewportRight - intersectRight,
      height: intersectBottom - intersectTop,
    })
  }

  return result
}

export function getDistance(a: Coord, b: Coord) {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

export const parseColorString = (color: string): RGB | undefined => {
  const rgbaRegex =
    /^rgba?\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})(?:,\s*(0|1|0?\.\d+))?\)$/

  const match = color.match(rgbaRegex)
  if (!match) {
    return
  }

  const r = Number.parseInt(match[1]!)
  const g = Number.parseInt(match[2]!)
  const b = Number.parseInt(match[3]!)
  const a = match[4] !== undefined ? Number.parseFloat(match[4]) : 1

  if ([r, g, b, a].some((val) => Number.isNaN(val))) {
    throw new Error('Invalid color values')
  }

  if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) {
    return
  }

  return [r, g, b]
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

/**
 * Calculate the ideal X coordinate for placing a rectangle.
 *
 * Coordinates are assumed to be 0,0 for top-left. The method returns a number that can be used to set the
 */
export const calculateCenterPosition = (
  // Rectangles that block the viewport.
  blockingRects: Rectangle[],
  // The viewport in which the center should be determined.
  // Note that this may not correspond to the actual browser viewport.
  viewport: Rectangle,
  // The width to use when determining the center.
  widthToPlace: number,
): number => {
  // The center of the viewport.
  const viewportCenterX = (viewport.x + viewport.width) / 2

  // The amount of pixels a blocking rect must be away from the center so it
  // affects positioning.
  const blockingThreshold = viewport.width / 7

  const x = blockingRects.reduce((acc, rect) => {
    // If the rectangle is left of the center.
    if (
      rect.x < viewportCenterX &&
      viewportCenterX - rect.x > blockingThreshold &&
      rect.x + rect.width > acc
    ) {
      return rect.x + rect.width
    }
    return acc
  }, viewport.x)

  const width = blockingRects.reduce((acc, rect) => {
    // If the rectangle is right of the center.
    if (
      rect.x > viewportCenterX &&
      rect.x - viewportCenterX > blockingThreshold &&
      rect.x < acc
    ) {
      return rect.x
    }
    return acc
  }, viewport.width + viewport.x)

  // Calculate the center X.
  return (x + width) / 2 - widthToPlace / 2
}

export function getContrastRatio(color1: RGB, color2: RGB): number {
  const luminance1 = getLuminance(color1)
  const luminance2 = getLuminance(color2)

  const lighter = Math.max(luminance1, luminance2)
  const darker = Math.min(luminance1, luminance2)

  return (lighter + 0.05) / (darker + 0.05)
}

function getLuminance(color: RGB): number {
  const [r, g, b] = color.map((val) => {
    val /= 255
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4)
  }) as [number, number, number]

  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function findHighestContrastColor(
  colors: RGB[],
  backgroundColor: RGB = [255, 255, 255],
): RGB {
  let maxContrast = 0
  let maxContrastColor: RGB = colors[0]!

  for (const color of colors) {
    const contrast = getContrastRatio(color, backgroundColor)
    if (contrast > maxContrast) {
      maxContrast = contrast
      maxContrastColor = color
    }
  }

  return maxContrastColor
}

export const rgbaToString = (color: RGB, alpha = 1): string =>
  `rgba(${[...color, alpha].join(', ')})`

export const getNumericStyleValue = (str: string, fallback = 0): number => {
  const v = str.replace('px', '')
  const num = Number.parseFloat(v)
  if (Number.isNaN(num) || num === 0) {
    return fallback
  }
  return num
}

/**
 * Position the given rectToPlace so that it doesn't overlap with any of the blockingRects.
 */
export function findIdealRectPosition(
  blockingRects: Rectangle[],
  rectToPlace: Rectangle,
  viewport: Rectangle,
  maxOverlap = 60,
): { x: number; y: number } {
  let targetX = rectToPlace.x

  for (const blockingRect of blockingRects) {
    if (intersects(rectToPlace, blockingRect)) {
      const a = Math.abs(rectToPlace.y + rectToPlace.height - blockingRect.y)
      const b = Math.abs(blockingRect.y + blockingRect.height - rectToPlace.y)
      const verticalOverlap = Math.min(a, b)

      const smoothingFactor = easeOutSine(
        Math.min(verticalOverlap, maxOverlap) / maxOverlap,
      )

      if (
        rectToPlace.x + rectToPlace.width / 2 >
        blockingRect.x + blockingRect.width / 2
      ) {
        targetX = blockingRect.x + blockingRect.width
      } else {
        targetX = blockingRect.x - rectToPlace.width
      }
      // Adjust targetX based on the smoothing factor
      targetX = rectToPlace.x + smoothingFactor * (targetX - rectToPlace.x)
      break
    }
  }

  return {
    x: Math.min(
      Math.max(targetX, viewport.x),
      viewport.x + viewport.width - rectToPlace.width,
    ),
    y: Math.min(
      Math.max(viewport.y, rectToPlace.y),
      viewport.height + viewport.y - rectToPlace.height,
    ),
  }
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

export function toShaderColor(rgba: RGB): RGB {
  return rgba.map((v) => v / 255) as RGB
}

export function generateUUID() {
  try {
    return crypto.randomUUID()
  } catch {
    // Noop.
  }

  let d = new Date().getTime(),
    d2 =
      (typeof performance !== 'undefined' &&
        performance.now &&
        performance.now() * 1000) ||
      0
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    let r = Math.random() * 16
    if (d > 0) {
      r = ((d + r) % 16) | 0
      d = Math.floor(d / 16)
    } else {
      r = ((d2 + r) % 16) | 0
      d2 = Math.floor(d2 / 16)
    }
    return (c == 'x' ? r : (r & 0x7) | 0x8).toString(16)
  })
}

export function asValidNumber(v: unknown, defaultValue: number): number {
  if (typeof v === 'number' && !Number.isNaN(v)) {
    return v
  }

  return defaultValue
}
