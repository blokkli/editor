/**
 * This file should contain all helpers that are meant for runtime functionality, such as defineBlokkli composable or <BlokkliProvider>.
 */

import type { BlockOptionDefinition } from '#blokkli/types/blokkOptions'

/**
 * Get the runtime value for an option.
 *
 * Internally, all option values are stored as strings. This function maps the stored data to the runtime value.
 */
export function getRuntimeOptionValue(
  definition: Pick<BlockOptionDefinition, 'type' | 'default'>,
  value: string | string[] | boolean | undefined | null | number,
): string | string[] | boolean {
  if (definition.type === 'checkbox') {
    if (typeof value === 'string') {
      return value === '1' || value === 'true'
    } else if (typeof value === 'boolean') {
      return value
    }
    return false
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
  }

  if (typeof value === 'string') {
    return value
  }

  return ''
}
