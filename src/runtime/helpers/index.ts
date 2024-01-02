import type {
  DraggableItem,
  SearchContentItem,
  Rectangle,
} from '#blokkli/types'
import { getDefinition } from '#blokkli/definitions'

const itemEntityType = useRuntimeConfig().public.blokkli.itemEntityType

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
  const dataset = element.dataset
  if (dataset.elementType === 'existing') {
    const uuid = dataset.uuid
    const itemBundle = dataset.itemBundle
    const hostType = dataset.hostType
    const hostUuid = dataset.hostUuid
    const hostBundle = dataset.hostBundle
    const hostFieldName = dataset.hostFieldName
    const reusableBundle = dataset.reusableBundle
    const reusableUuid = dataset.reusableUuid
    const isNew = dataset.isNew === 'true'
    if (
      uuid &&
      hostType &&
      hostUuid &&
      hostFieldName &&
      itemBundle &&
      hostBundle
    ) {
      const definition = getDefinition(itemBundle)
      const editTitle =
        definition && definition.editTitle
          ? definition?.editTitle(element)
          : undefined
      return {
        itemType: 'existing',
        element: () =>
          document.querySelector(`[data-uuid="${uuid}"]`) as HTMLElement,
        itemBundle,
        isNested: hostType === itemEntityType,
        uuid,
        hostType,
        hostBundle,
        hostUuid,
        hostFieldName,
        reusableBundle,
        reusableUuid,
        editTitle,
        isNew,
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
    const clipboardData = dataset.clipboardData
    const additional = dataset.clipboardAdditional
    const itemBundle = dataset.itemBundle
    const id = dataset.sortliId
    if (clipboardData && itemBundle) {
      const searchItemData = dataset.clipboardSearchItem
      if (searchItemData) {
        const searchItem = JSON.parse(
          searchItemData,
        ) as SearchContentItem
        return {
          itemType: 'search_content',
          element: () =>
            document.querySelector(`[data-sortli-id="${id}"]`) as HTMLElement,
          itemBundle,
          searchItem,
        }
      }
      return {
        itemType: 'clipboard',
        element: () =>
          document.querySelector(`[data-sortli-id="${id}"]`) as HTMLElement,
        itemBundle,
        clipboardData,
        additional,
      }
    }
  }
}

export function findElement(uuid: string): HTMLElement | undefined {
  const el = document.querySelector(`[data-uuid="${uuid}"]`)
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

export function removeDroppedElements() {
  document
    .querySelectorAll('.bk-draggable-list-container .bk-clone')
    .forEach((v) => v.remove())
  document
    .querySelectorAll('.bk-draggable-list-container .bk-moved-item')
    .forEach((v) => v.remove())
  document
    .querySelectorAll('.bk-multi-select-hidden')
    .forEach((v) => v.classList.remove('bk-multi-select-hidden'))
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
 *
 * Distance is measured from the center pooint of the rectangle to the given x and y coords.
 */
export function findClosestRectangle<T extends Rectangle>(
  x: number,
  y: number,
  rects: T[],
): T {
  let closestRect: T = rects[0]
  let minDistance = distanceToRectangle(x, y, rects[0])

  for (let i = 1; i < rects.length; i++) {
    const rect = rects[i]
    const distance = distanceToRectangle(x, y, rect)

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

export function realBackgroundColor(el: HTMLElement | null) {
  const transparent = 'rgba(0, 0, 0, 0)'
  if (!el) return transparent

  const bg = getComputedStyle(el).backgroundColor
  if (bg === transparent || bg === 'transparent') {
    return realBackgroundColor(el.parentElement)
  } else {
    return bg
  }
}

export const lerp = (s: number, e: number, t: number) => s * (1 - t) + e * t
