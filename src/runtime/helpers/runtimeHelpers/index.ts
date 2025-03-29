/**
 * This file should contain all helpers that are meant for runtime functionality, such as defineBlokkli composable or <BlokkliProvider>.
 */
import {
  OPTIONS,
  type RuntimeBlockOptionArray,
  type RuntimeBlockOptions,
} from '#blokkli-build/runtime-options'
import type { FieldListItemTyped } from '#blokkli-build/generated-types'
import type { BlockOptionDefinition } from '#blokkli/types/blokkOptions'
import {
  bundlesWithVisibleLanguage,
  bundlesWithHiddenGlobally,
} from '#blokkli-build/default-global-options'
import type { FieldListItem } from '#blokkli/types'
import { BK_HIDDEN_GLOBALLY, BK_VISIBLE_LANGUAGES } from '../symbols'

/**
 * Map all kinds of truthy values for a checkbox.
 * Returns our "internal" value of a checkbox state.
 */
export function mapCheckboxTrue(v?: unknown): '1' | '0' {
  return v === true || v === '1' || v === 1 || v === 'true' ? '1' : '0'
}

export function isValidDatetimeLocalValue(value: string): boolean {
  // Regular expression to validate the datetime-local format
  // Format: YYYY-MM-DDThh:mm with optional :ss and .sss
  const pattern =
    /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])T([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d(\.\d{1,3})?)?$/

  return pattern.test(value)
}

/**
 * Get the runtime value for an option.
 *
 * Internally, all option values are stored as strings. This function maps the stored data to the runtime value.
 */
export function getRuntimeOptionValue(
  definition:
    | Pick<BlockOptionDefinition, 'type' | 'default'>
    | RuntimeBlockOptionArray,
  value: string | string[] | boolean | undefined | null | number,
): string | string[] | boolean | number {
  const type = Array.isArray(definition) ? definition[0] : definition.type

  const defaultValue = Array.isArray(definition)
    ? definition[1]
    : definition.default

  // If no value is provided, return the default value.
  if ((value === null || value === undefined) && defaultValue !== undefined) {
    return defaultValue
  }

  if (type === 'checkbox') {
    return mapCheckboxTrue(value) === '1'
  } else if (type === 'radios') {
    if (typeof value === 'string') {
      return value
    }
  } else if (type === 'checkboxes') {
    if (typeof value === 'string') {
      return value.split(',')
    } else if (Array.isArray(value)) {
      return value
    }
  } else if (type === 'range' || type === 'number') {
    if (typeof value === 'number' && !Number.isNaN(value)) {
      return value
    } else if (typeof value === 'string') {
      const parsed = Number.parseFloat(value)
      if (!Number.isNaN(parsed)) {
        return parsed
      }
    }
  } else if (type === 'color') {
    if (typeof value === 'string') {
      if (value.startsWith('#')) {
        return value
      } else if (value.length === 6) {
        return `#${value}`
      }
    }
  } else if (type === 'text' && typeof value === 'string') {
    return value
  } else if (
    type === 'datetime-local' &&
    typeof value === 'string' &&
    isValidDatetimeLocalValue(value)
  ) {
    return value
  }

  if (defaultValue === undefined) {
    return ''
  }

  return defaultValue
}

/**
 * Determines whether an item is visible.
 */
export function isVisibleByOptions(
  item?: FieldListItemTyped | FieldListItem,
  language?: string,
) {
  // Make the method accept a nullable argument because field item lists may
  // contain falsy values in their arrays.
  if (!item) {
    return false
  }

  if (item.options) {
    // Hide if the "hidden globally" option is set.
    if (
      bundlesWithHiddenGlobally.includes(item.bundle) &&
      mapCheckboxTrue(item.options[BK_HIDDEN_GLOBALLY]) === '1'
    ) {
      return false
    }

    // Hide if the bundle has the "visible languages" option enabled and if
    // the current language is not included in the visible languages.
    if (bundlesWithVisibleLanguage.includes(item.bundle)) {
      const option = item.options[BK_VISIBLE_LANGUAGES]
      if (language && option && typeof option === 'string') {
        const languages = option.split(',')
        if (languages.length && !languages.includes(language)) {
          return false
        }
      }
    }
  }

  return true
}

/**
 * Returns the runtime options for a block.
 *
 * If the provided item's bundle is 'from_library', the method will merge the
 * options defined in the reusable block with the options defined in the
 * from_library block.
 */
export function getRuntimeOptions<K extends keyof RuntimeBlockOptions>(
  item: FieldListItemTyped & { bundle: K },
  fromLibraryOptions?: Record<string, any>,
): RuntimeBlockOptions[K] {
  if (item.bundle === 'from_library' && 'libraryItem' in item.props) {
    const actualBlock = item.props.libraryItem?.block
    if (!actualBlock) {
      throw new Error('Missing block')
    }

    return getRuntimeOptions(
      actualBlock as FieldListItemTyped,
      item.options,
    ) as RuntimeBlockOptions[K]
  }

  const availableOptions = OPTIONS['block:' + item.bundle] || {}

  return Object.entries(availableOptions).reduce<Record<string, any>>(
    (acc, [key, definition]) => {
      // Use the option inherited from the "from_library" block if this block is reusable.
      if (
        fromLibraryOptions &&
        fromLibraryOptions[key] !== undefined &&
        fromLibraryOptions[key] !== null
      ) {
        acc[key] = getRuntimeOptionValue(
          definition,
          fromLibraryOptions.value[key],
        )
        return acc
      }

      if (
        item.options &&
        item.options[key] !== undefined &&
        item.options[key] !== null
      ) {
        // Use the persisted option value on the item itself.
        acc[key] = getRuntimeOptionValue(definition, item.options[key])
        return acc
      }

      // Use the default value.
      acc[key] = definition[1]

      return acc
    },
    {},
  ) as RuntimeBlockOptions[K]
}

/**
 * Get the actual block for reusable blocks.
 *
 * If the provided bundle is 'from_library', the method will merge the options
 * from both the from_library block and the actual block.
 */
export function getActualBlock(
  item: FieldListItemTyped,
): FieldListItemTyped | null {
  if (item.bundle === 'from_library') {
    const block = item.props.libraryItem?.block
    if (!block) {
      return null
    }
    const mergedOptions = {
      ...(item.options || {}),
      ...(block.options || {}),
    }
    return { ...block, options: mergedOptions } as FieldListItemTyped
  }

  return item
}

export function getItemsforBundles<K extends FieldListItemTyped['bundle']>(
  items: FieldListItemTyped[],
  bundles: K[],
): Extract<FieldListItemTyped, { bundle: K }>[] {
  const filtered: FieldListItemTyped[] = []
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (item.bundle === 'from_library') {
      const actual = getActualBlock(item)
      if (actual && bundles.includes(actual.bundle as K)) {
        filtered.push(actual)
      }
    } else if (bundles.includes(item.bundle as K)) {
      filtered.push(item)
    }
  }
  return filtered as Extract<FieldListItemTyped, { bundle: K }>[]
}
