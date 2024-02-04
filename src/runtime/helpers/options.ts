import type { BlockOptionDefinition } from '#blokkli/types/blokkOptions'

export function optionValueToStorable(
  definition: BlockOptionDefinition,
  value: string | string[] | boolean | undefined | null | number,
): string {
  if (definition.type === 'checkbox') {
    if (typeof value === 'string' && (value === '1' || value === '0')) {
      return value
    } else if (typeof value === 'boolean') {
      return value === true ? '1' : '0'
    }
    return '0'
  } else if (definition.type === 'text') {
    if (typeof value === 'string') {
      return value
    }
  } else if (definition.type === 'radios') {
    if (typeof value === 'string') {
      return value
    }
  } else if (definition.type === 'checkboxes') {
    if (Array.isArray(value)) {
      return value.join(',')
    } else if (typeof value === 'string') {
      return value
    }
  }

  return ''
}
