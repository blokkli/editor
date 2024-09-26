/**
 * This file should contain all helpers that are meant for runtime functionality, such as defineBlokkli composable or <BlokkliProvider>.
 */

import type { BlockOptionDefinition } from '#blokkli/types/blokkOptions'

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
