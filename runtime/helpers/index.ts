import type {
  DraggableItem,
  BlokkliSearchContentItem,
  Rectangle,
} from '#blokkli/types'
import { getDefinition } from '#blokkli/definitions'

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
  element: Element,
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
        element,
        itemBundle,
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
  } else if (dataset.elementType === 'reusable') {
    const itemBundle = dataset.itemBundle
    const libraryItemUuid = dataset.libraryItemUuid
    if (itemBundle && libraryItemUuid) {
      return {
        itemType: 'reusable',
        element,
        itemBundle,
        libraryItemUuid,
      }
    }
  } else if (dataset.elementType === 'new') {
    const itemBundle = dataset.itemBundle
    if (itemBundle) {
      return {
        itemType: 'new',
        element,
        itemBundle,
      }
    }
  } else if (dataset.elementType === 'clipboard') {
    const clipboardData = dataset.clipboardData
    const additional = dataset.clipboardAdditional
    const itemBundle = dataset.itemBundle
    if (clipboardData && itemBundle) {
      const searchItemData = dataset.clipboardSearchItem
      if (searchItemData) {
        const searchItem = JSON.parse(
          searchItemData,
        ) as BlokkliSearchContentItem
        return {
          itemType: 'search_content',
          element,
          itemBundle,
          searchItem,
        }
      }
      return {
        itemType: 'clipboard',
        element,
        itemBundle,
        clipboardData,
        additional,
      }
    }
  } else if (dataset.elementType === 'multiple_existing') {
    const bundles = (dataset.bundles || '').split(',')
    const uuids = (dataset.uuids || '').split(',')
    return {
      itemType: 'multiple_existing',
      bundles,
      uuids,
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

export function getBounds(rects: DOMRect[]): Rectangle | undefined {
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
