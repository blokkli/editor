import type { DraggableItem, PbSearchContentItem } from '#pb/types'
import { getDefinition } from '#nuxt-paragraphs-builder/definitions'

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
  element: HTMLElement,
): DraggableItem | undefined {
  const dataset = element.dataset
  if (dataset.elementType === 'existing') {
    const uuid = dataset.uuid
    const paragraphType = dataset.paragraphType
    const hostType = dataset.hostType
    const hostUuid = dataset.hostUuid
    const hostBundle = dataset.hostBundle
    const hostFieldName = dataset.hostFieldName
    const reusableBundle = dataset.reusableBundle
    const reusableUuid = dataset.reusableUuid
    if (
      uuid &&
      hostType &&
      hostUuid &&
      hostFieldName &&
      paragraphType &&
      hostBundle
    ) {
      const definition = getDefinition(paragraphType)
      const editTitle =
        definition && definition.editTitle
          ? definition?.editTitle(element)
          : undefined
      return {
        itemType: 'existing',
        element,
        paragraphType,
        uuid,
        hostType,
        hostBundle,
        hostUuid,
        hostFieldName,
        reusableBundle,
        reusableUuid,
        editTitle,
      }
    }
  } else if (dataset.elementType === 'reusable') {
    const paragraphBundle = dataset.paragraphBundle
    const libraryItemUuid = dataset.libraryItemUuid
    if (paragraphBundle && libraryItemUuid) {
      return {
        itemType: 'reusable',
        element,
        paragraphBundle,
        libraryItemUuid,
      }
    }
  } else if (dataset.elementType === 'new') {
    const paragraphType = dataset.paragraphType
    if (paragraphType) {
      return {
        itemType: 'new',
        element,
        paragraphType,
      }
    }
  } else if (dataset.elementType === 'clipboard') {
    const clipboardData = dataset.clipboardData
    const additional = dataset.clipboardAdditional
    const paragraphType = dataset.paragraphType
    if (clipboardData && paragraphType) {
      const searchItemData = dataset.clipboardSearchItem
      if (searchItemData) {
        const searchItem = JSON.parse(searchItemData) as PbSearchContentItem
        return {
          itemType: 'search_content',
          element,
          paragraphType,
          searchItem,
        }
      }
      return {
        itemType: 'clipboard',
        element,
        paragraphType,
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

export function findParagraphElement(uuid: string): HTMLElement | undefined {
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
    .querySelectorAll('.pb-paragraphs-container .pb-clone')
    .forEach((v) => v.remove())
  document
    .querySelectorAll('.pb-paragraphs-container .pb-moved-item')
    .forEach((v) => v.remove())
  document
    .querySelectorAll('.pb-multi-select-hidden')
    .forEach((v) => v.classList.remove('pb-multi-select-hidden'))
}

export function modulo(n: number, m: number) {
  return ((n % m) + m) % m
}
