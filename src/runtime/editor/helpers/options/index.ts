import type { BlockOptionDefinition } from '#blokkli/types/blockOptions'
import type { BlockDefinitionOptionsInput } from '#blokkli/types/definitions'
import type { DefinitionString } from '../../../../global/types/blockOptions'
import { defaultLanguage } from '#blokkli-build/editor-config'

export type OptionItem = {
  property: string
  option: BlockOptionDefinition
}

/**
 * Get available options for a block definition by merging
 * block-specific options with referenced global options.
 */
export function getAvailableOptions(
  definitionOptions: BlockDefinitionOptionsInput | undefined,
  globalOptionKeys: string[] | undefined,
  globalOptionsMap: Record<string, BlockOptionDefinition>,
): OptionItem[] {
  const options = definitionOptions || {}

  const global = (globalOptionKeys || []).reduce<BlockDefinitionOptionsInput>(
    (acc, key) => {
      const globalDefinition = globalOptionsMap[key]
      if (globalDefinition) {
        acc[key] = globalDefinition
      }
      return acc
    },
    {},
  )

  return Object.entries({ ...options, ...global }).map(
    ([property, option]) => ({
      property,
      option,
    }),
  )
}

/**
 * Get the current value for an option, checking mutated options first,
 * then falling back to the default value.
 */
export function getMutatedOptionValue(
  mutatedOptions: Record<string, Record<string, string>> | undefined,
  uuid: string,
  key: string,
  defaultValue: string | boolean | string[] | number | undefined,
): string | boolean | string[] | number | undefined {
  if (!uuid) {
    return ''
  }
  const blockMutatedOptions = mutatedOptions?.[uuid]
  if (
    blockMutatedOptions !== undefined &&
    blockMutatedOptions[key] !== undefined
  ) {
    return blockMutatedOptions[key]
  }
  return defaultValue
}

/**
 * Convert a typed option value to the string format expected by the adapter.
 */
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
  } else if (
    definition.type === 'text' ||
    definition.type === 'radios' ||
    definition.type === 'datetime-local'
  ) {
    if (typeof value === 'string') {
      return value
    }
  } else if (definition.type === 'checkboxes') {
    if (Array.isArray(value)) {
      return value.join(',')
    } else if (typeof value === 'string') {
      return value
    }
  } else if (definition.type === 'number' || definition.type === 'range') {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value)
    } else if (typeof value === 'string') {
      if (
        definition.type === 'number' &&
        definition.nullable &&
        value.trim() === ''
      ) {
        return ''
      }
      return value
    }
    if (
      definition.type === 'number' &&
      definition.nullable &&
      (value === undefined || value === null)
    ) {
      return ''
    }
  } else if (definition.type === 'color') {
    if (typeof value === 'string') {
      return value
    }
  } else if (definition.type === 'json') {
    if (typeof value === 'string') {
      return value
    }
    return JSON.stringify(value)
  }

  return ''
}

export function resolveDefinitionString(
  definitionString: DefinitionString,
  langcode?: string,
): string {
  if (!definitionString) {
    return ''
  }

  if (typeof definitionString === 'string') {
    return definitionString
  }

  if (langcode) {
    const translation = definitionString[langcode]

    if (translation) {
      return translation
    }
  }

  const defaultTranslation = definitionString[defaultLanguage]

  if (defaultTranslation) {
    return defaultTranslation
  }

  const firstValue = Object.values(definitionString)[0]
  return firstValue ?? ''
}
