import { easeOutSine } from './easing'
import type {
  DraggableItem,
  SearchContentItem,
  Rectangle,
  DroppableEntityField,
  DraggableExistingBlock,
  EntityContext,
  Coord,
} from '#blokkli/types'
import { useRuntimeConfig } from '#imports'
import { getDefinition } from '#blokkli/definitions'
import type { RGB } from '#blokkli/types/theme'
import type { ValidFieldListTypes } from '#blokkli/generated-types'

/**
 * Type check for falsy values.
 *
 * Used as the callback for array.filter, e.g.
 * items.filter(falsy)
 */
export function falsy<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined
}

/**
 * Maps a HTML element that is draggable to a draggable item data object.
 */
export function buildDraggableItem(
  element: Element | EventTarget,
): DraggableItem | undefined {
  if (!(element instanceof HTMLElement)) {
    return
  }
  const itemEntityType = useRuntimeConfig().public.blokkli.itemEntityType
  const dataset = element.dataset
  if (dataset.elementType === 'existing') {
    const uuid = dataset.uuid
    const itemBundle = dataset.itemBundle
    const entityType = dataset.entityType
    const hostType = dataset.hostType
    const hostUuid = dataset.hostUuid
    const hostBundle = dataset.hostBundle
    const hostFieldName = dataset.hostFieldName
    const reusableBundle = dataset.reusableBundle
    const hostFieldListType = dataset.hostFieldListType as
      | ValidFieldListTypes
      | undefined
    const libraryItemUuid = dataset.bkLibraryItemUuid
    const isNew = dataset.isNew === 'true'
    const parentBlockBundle =
      hostType === itemEntityType ? (hostBundle as any) : undefined
    if (
      uuid &&
      hostType &&
      hostUuid &&
      hostFieldName &&
      itemBundle &&
      hostBundle &&
      entityType &&
      hostFieldListType
    ) {
      const definition = getDefinition(
        itemBundle,
        hostFieldListType,
        parentBlockBundle,
      )
      const libraryLabel = dataset.bkLibraryLabel
      const editTitle =
        libraryLabel ||
        (definition?.editor?.editTitle
          ? definition?.editor.editTitle(element)
          : undefined)
      return {
        itemType: 'existing',
        element: () =>
          document.querySelector(`[data-uuid="${uuid}"]`) as HTMLElement,
        itemBundle,
        entityType,
        isNested: hostType === itemEntityType,
        uuid,
        hostType,
        hostBundle,
        hostUuid,
        hostFieldName,
        hostFieldListType,
        reusableBundle,
        libraryItemUuid,
        editTitle: editTitle || undefined,
        isNew,
        parentBlockBundle,
      }
    }
  } else if (dataset.elementType === 'new') {
    const itemBundle = dataset.itemBundle
    if (itemBundle) {
      return {
        itemType: 'new',
        element: () =>
          document.querySelector(
            `[data-sortli-id="${itemBundle}"]`,
          ) as HTMLElement,
        itemBundle,
      }
    }
  } else if (dataset.elementType === 'action') {
    const actionType = dataset.actionType
    const itemBundle = dataset.itemBundle
    if (actionType) {
      return {
        itemType: 'action',
        actionType,
        itemBundle,
        element: () =>
          document.querySelector(
            `[data-element-type="action"][data-sortli-id="${actionType}"]`,
          ) as HTMLElement,
      }
    }
  } else if (dataset.elementType === 'clipboard') {
    const additional = dataset.clipboardAdditional
    const itemBundle = dataset.itemBundle
    const clipboardId = dataset.clipboardId
    const id = dataset.sortliId
    if (itemBundle && clipboardId) {
      return {
        itemType: 'clipboard',
        element: () =>
          document.querySelector(`[data-sortli-id="${id}"]`) as HTMLElement,
        itemBundle,
        additional,
        clipboardId,
      }
    }
  } else if (dataset.elementType === 'media_library') {
    const mediaId = dataset.mediaId
    const itemBundle = dataset.itemBundle
    const mediaBundle = dataset.mediaBundle
    if (mediaId && itemBundle && mediaBundle) {
      return {
        itemType: 'media_library',
        mediaId,
        itemBundle,
        mediaBundle,
        element: () =>
          document.querySelector(
            `[data-element-type="media_library"][data-media-id="${mediaId}"]`,
          ) as HTMLElement,
      }
    }
  } else if (dataset.elementType === 'search_content') {
    const searchItemData = dataset.searchItem
    const id = dataset.sortliId
    if (searchItemData && id) {
      const searchItem = JSON.parse(searchItemData) as SearchContentItem
      return {
        itemType: 'search_content',
        element: () =>
          document.querySelector(`[data-sortli-id="${id}"]`) as HTMLElement,
        itemBundle: searchItem.targetBundles[0],
        searchItem,
      }
    }
  }
}

export function findElement(uuid: string): HTMLElement | undefined {
  // Make sure to only select elements that are not currently in the process
  // of transitioning out. This solves a bug where when the selected block
  // is deleted, the reactive selection would return an element that wouldn't
  // exist a moment later.
  const el = document.querySelector(
    `[data-uuid="${uuid}"]:not(.bk-sortli-leave-from)`,
  )
  if (el instanceof HTMLElement) {
    return el
  }
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
  const divisor = unitIndex ? cutoffs[unitIndex - 1] : 1

  // Intl.RelativeTimeFormat do its magic
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' })
  return rtf.format(Math.floor(deltaSeconds / divisor), units[unitIndex])
}

export function modulo(n: number, m: number) {
  return ((n % m) + m) % m
}

export function getBounds(rects: Rectangle[]): Rectangle | undefined {
  if (!rects.length) {
    return
  }

  const firstRect = rects[0]
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
  let closestRect: T = rects[0]
  let minDistance = distanceToClosestRectangleEdge(x, y, rects[0])

  for (let i = 1; i < rects.length; i++) {
    const rect = rects[i]
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

  const r = Number.parseInt(match[1])
  const g = Number.parseInt(match[2])
  const b = Number.parseInt(match[3])
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
  })

  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function findHighestContrastColor(
  colors: RGB[],
  backgroundColor: RGB = [255, 255, 255],
): RGB {
  let maxContrast = 0
  let maxContrastColor: RGB = colors[0]

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

export const findClosestBlock = (
  el: Element | EventTarget,
): DraggableExistingBlock | undefined => {
  if (!(el instanceof Element)) {
    return
  }
  const closest = el.closest('[data-element-type="existing"]')
  if (!closest) {
    return
  }
  const item = buildDraggableItem(closest)
  if (item?.itemType !== 'existing') {
    return
  }
  return item
}

/**
 * Find the closest entity context from a BlokkliProvider.
 */
export const findClosestEntityContext = (
  el: HTMLElement,
): EntityContext | undefined => {
  const provider = el.closest('[data-blokkli-provider-active="true"]')
  if (!(provider instanceof HTMLElement)) {
    return
  }
  const uuid = provider.dataset.providerUuid
  const type = provider.dataset.providerEntityType
  const bundle = provider.dataset.providerEntityBundle
  if (uuid && type && bundle) {
    return {
      uuid,
      type,
      bundle,
    }
  }
}

export const findParentContext = (
  el: HTMLElement,
): EntityContext | DraggableExistingBlock | undefined => {
  const block = findClosestBlock(el)
  if (block) {
    return block
  }

  return findClosestEntityContext(el)
}

/**
 * Maps a HTMLElement to a DroppableEntityField.
 */
export const mapDroppableField = (el: Element): DroppableEntityField => {
  if (!(el instanceof HTMLElement)) {
    throw new TypeError(
      `v-blokkli-droppable directive is only allowed on elements of type HTMLElement.`,
    )
  }

  const fieldName = el.dataset.blokkliDroppableField
  if (!fieldName) {
    throw new Error(`Missing field name in v-blokkli-droppable directive.`)
  }

  const host = findParentContext(el)
  if (!host) {
    throw new Error(
      `Failed to locate parent context for v-blokkli-droppable field with name "${fieldName}". Make sure the element is always rendered inside a block component or inside a <BlokkliProvider>.`,
    )
  }

  return {
    element: el,
    host,
    fieldName,
  }
}

export const originatesFromEditable = (
  e: MouseEvent | TouchEvent,
): HTMLElement | undefined => {
  if (e.target instanceof HTMLElement) {
    const el = e.target.closest('[data-blokkli-editable-field]')
    if (el instanceof HTMLElement) {
      return el
    }
  }
}

export const getOriginatingDroppableElement = (
  e: MouseEvent | TouchEvent,
): HTMLElement | undefined => {
  if (e.target instanceof HTMLElement) {
    const el = e.target.closest('[data-blokkli-droppable-field]')
    if (el instanceof HTMLElement) {
      return el
    }
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
    return {
      x: touch.clientX,
      y: touch.clientY,
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
      r = (d + r) % 16 | 0
      d = Math.floor(d / 16)
    } else {
      r = (d2 + r) % 16 | 0
      d2 = Math.floor(d2 / 16)
    }
    return (c == 'x' ? r : (r & 0x7) | 0x8).toString(16)
  })
}
