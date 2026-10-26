import type {
  BlockOptionDefinitionBase,
  RuntimeBlockOptionArray,
} from '../../global/types/blockOptions'
import type { BlockDefinitionOptionsInputBase } from '../../global/types/definitions'
import { BUILT_IN_OPTION_TEXTS } from '../../global/constants'

export function toRuntimeOptionArray(
  option: BlockOptionDefinitionBase,
): RuntimeBlockOptionArray {
  if (option.type === 'radios') {
    return [option.type, option.default, Object.keys(option.options)]
  } else if (option.type === 'checkboxes') {
    return [option.type, option.default, Object.keys(option.options)]
  } else if (option.type === 'number') {
    const hasBounds = option.min !== undefined || option.max !== undefined
    if (option.nullable) {
      return [option.type, option.default, [option.min, option.max], true]
    }
    if (hasBounds) {
      return [option.type, option.default, [option.min, option.max]]
    }
    return [option.type, option.default]
  } else if (option.type === 'range') {
    return [option.type, option.default, [option.min, option.max]]
  } else if (option.type === 'datetime-local') {
    if (option.min !== undefined || option.max !== undefined) {
      return [option.type, option.default, [option.min, option.max]]
    }
    return [option.type, option.default]
  } else if (option.type === 'checkbox') {
    return [option.type, option.default]
  } else if (option.type === 'color') {
    return [option.type, option.default]
  } else if (option.type === 'json') {
    if (option.dataType) {
      return [option.type, option.default, option.dataType]
    }
    return [option.type, option.default]
  }
  return [option.type, option.default]
}

/**
 * Replace the texts of blökkli's own global options with their translations,
 * unless the project changed them. The editor and Drupal's forms (through the
 * options schema) then show them in the page's language.
 *
 * @param globalOptions - The global options.
 * @param translations - The editor's texts, keyed by language.
 */
export function translateBuiltInOptions(
  globalOptions: BlockDefinitionOptionsInputBase,
  translations: Record<string, Record<string, string>>,
): BlockDefinitionOptionsInputBase {
  const translate = (key: string, text: string): Record<string, string> => {
    const result: Record<string, string> = { en: text }
    for (const [langcode, texts] of Object.entries(translations)) {
      const translation = texts[key]
      if (translation) {
        result[langcode] = translation
      }
    }
    return result
  }

  const translated = { ...globalOptions }

  for (const [property, texts] of Object.entries(BUILT_IN_OPTION_TEXTS)) {
    const option = globalOptions[property]
    if (!option) {
      continue
    }

    translated[property] = {
      ...option,
      label:
        option.label === texts.label
          ? translate(`blockOption_${property}_label`, texts.label)
          : option.label,
      description:
        option.description === texts.description
          ? translate(`blockOption_${property}_description`, texts.description)
          : option.description,
    }
  }

  return translated
}
