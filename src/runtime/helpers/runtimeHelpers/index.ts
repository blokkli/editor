/**
 * This file should contain all helpers that are meant for runtime functionality, such as defineBlokkli composable or <BlokkliProvider>.
 */

import type { FieldListItemTyped } from '#blokkli/generated-types'
import type { BlockOptionDefinition } from '#blokkli/types/blokkOptions'
import {
  bundlesWithVisibleLanguage,
  bundlesWithHiddenGlobally,
} from '#blokkli/default-global-options'
import type { FieldListItem } from '#blokkli/types'
import { BK_HIDDEN_GLOBALLY, BK_VISIBLE_LANGUAGES } from '../symbols'

/**
 * Map all kinds of truthy values for a checkbox.
 * Returns our "internal" value of a checkbox state.
 */
export function mapCheckboxTrue(v?: unknown): '1' | '0' {
  return v === true || v === '1' || v === 1 || v === 'true' ? '1' : '0'
}

/**
 * Get the runtime value for an option.
 *
 * Internally, all option values are stored as strings. This function maps the stored data to the runtime value.
 */
export function getRuntimeOptionValue(
  definition: Pick<BlockOptionDefinition, 'type' | 'default'>,
  value: string | string[] | boolean | undefined | null | number,
): string | string[] | boolean | number {
  if (definition.type === 'checkbox') {
    return mapCheckboxTrue(value) === '1'
  } else if (definition.type === 'radios') {
    if (typeof value === 'string') {
      return value
    }
    return ''
  } else if (definition.type === 'checkboxes') {
    if (typeof value === 'string') {
      return value.split(',')
    } else if (Array.isArray(value)) {
      return value
    }
    return []
  } else if (definition.type === 'range' || definition.type === 'number') {
    if (typeof value === 'number' && !Number.isNaN(value)) {
      return value
    } else if (typeof value === 'string') {
      const parsed = Number.parseFloat(value)
      if (!Number.isNaN(parsed)) {
        return parsed
      }
    }
  }

  if (typeof value === 'string') {
    return value
  }

  return ''
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
