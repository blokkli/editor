import type { IconCollector } from '../Collector/Icons'
import type { BlockOptionDefinitionBase } from '../../global/types/blockOptions'

export type OptionValidationError = {
  message: string
  optionKey?: string
  severity?: 'error' | 'warning'
}

/**
 * Validate a single option and return any errors.
 */
export function validateOption(
  optionKey: string,
  option: BlockOptionDefinitionBase,
  icons: IconCollector,
): OptionValidationError[] {
  const errors: OptionValidationError[] = []

  switch (option.type) {
    case 'radios': {
      // Validate that the default value matches one of the defined options
      const defaultValue = option.default
      const availableOptions = option.options

      if (
        availableOptions &&
        typeof availableOptions === 'object' &&
        defaultValue !== undefined
      ) {
        const optionKeys = Object.keys(availableOptions)
        if (!optionKeys.includes(defaultValue)) {
          errors.push({
            message: `Option "${optionKey}" has default value "${defaultValue}" which is not one of the available options: ${optionKeys.map((k) => `"${k}"`).join(', ')}`,
            optionKey,
          })
        }
      }

      if (option.displayAs === 'icons') {
        const options = Object.entries(option.options)
        for (const [optionsOptionKey, optionsOptionValue] of options) {
          const icon = optionsOptionValue.icon
          if (!icons.isValidIconName(icon)) {
            errors.push({
              message: `Invalid icon name "${icon}" in option "${optionsOptionKey}" of "${optionKey}".`,
              optionKey,
            })
          }
        }
      }
      break
    }

    case 'checkboxes': {
      // Validate that each default value matches one of the defined options
      const defaultValues = option.default
      const availableOptions = option.options

      if (
        Array.isArray(defaultValues) &&
        availableOptions &&
        typeof availableOptions === 'object'
      ) {
        const optionKeys = Object.keys(availableOptions)
        for (const value of defaultValues) {
          if (!optionKeys.includes(value)) {
            errors.push({
              message: `Option "${optionKey}" has default value "${value}" which is not one of the available options: ${optionKeys.map((k) => `"${k}"`).join(', ')}`,
              optionKey,
            })
          }
        }
      }
      break
    }

    case 'number':
    case 'range': {
      // Validate that the default value is within the min/max range
      const defaultValue = option.default
      const min = option.min
      const max = option.max

      if (typeof defaultValue === 'number') {
        if (typeof min === 'number' && defaultValue < min) {
          errors.push({
            message: `Option "${optionKey}" has default value ${defaultValue} which is less than the minimum value ${min}`,
            optionKey,
          })
        }
        if (typeof max === 'number' && defaultValue > max) {
          errors.push({
            message: `Option "${optionKey}" has default value ${defaultValue} which is greater than the maximum value ${max}`,
            optionKey,
          })
        }
      }
      break
    }

    case 'color': {
      // Validate that the default value is a valid hex color
      const defaultValue = option.default

      if (typeof defaultValue === 'string') {
        const hexColorRegex = /^#[0-9A-F]{6}$/i
        if (!hexColorRegex.test(defaultValue)) {
          errors.push({
            message: `Option "${optionKey}" has default value "${defaultValue}" which is not a valid hex color (expected format: #RRGGBB)`,
            optionKey,
          })
        }
      }
      break
    }

    case 'datetime-local': {
      // Validate that the default value is between min and max if specified
      const defaultValue = option.default
      const min = option.min
      const max = option.max

      if (typeof defaultValue === 'string') {
        const defaultDate = new Date(defaultValue)
        if (Number.isNaN(defaultDate.getTime())) {
          errors.push({
            message: `Option "${optionKey}" has default value "${defaultValue}" which is not a valid datetime`,
            optionKey,
          })
        } else {
          if (typeof min === 'string') {
            const minDate = new Date(min)
            if (!Number.isNaN(minDate.getTime()) && defaultDate < minDate) {
              errors.push({
                message: `Option "${optionKey}" has default value "${defaultValue}" which is before the minimum "${min}"`,
                optionKey,
              })
            }
          }
          if (typeof max === 'string') {
            const maxDate = new Date(max)
            if (!Number.isNaN(maxDate.getTime()) && defaultDate > maxDate) {
              errors.push({
                message: `Option "${optionKey}" has default value "${defaultValue}" which is after the maximum "${max}"`,
                optionKey,
              })
            }
          }
        }
      }
      break
    }
  }

  return errors
}

/**
 * Validate all options in an options object.
 */
export function validateOptions(
  options: Record<string, BlockOptionDefinitionBase> | undefined,
  icons: IconCollector,
): OptionValidationError[] {
  if (!options) {
    return []
  }

  const errors: OptionValidationError[] = []

  for (const [optionKey, option] of Object.entries(options)) {
    if (!option || typeof option !== 'object') {
      continue
    }

    const optionErrors = validateOption(optionKey, option, icons)
    errors.push(...optionErrors)
  }

  return errors
}
