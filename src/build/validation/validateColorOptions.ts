import type { ColorOption } from '../../global/types/colorOptions'
import type { OptionValidationError } from './validateOptions'

const HEX_COLOR_REGEX = /^#(?:[\da-f]{3}|[\da-f]{6})$/i
const VALID_ID_REGEX = /^[a-z_$][\w$]*$/i

function isHex(value: unknown): value is string {
  return typeof value === 'string' && HEX_COLOR_REGEX.test(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function hasShades(
  option: ColorOption,
): option is Extract<ColorOption, { shades: Record<string, string> }> {
  return (
    'shades' in option && !!option.shades && typeof option.shades === 'object'
  )
}

/**
 * Validate a single colorOptions entry and return any errors.
 */
export function validateColorOption(
  colorId: string,
  option: ColorOption,
): OptionValidationError[] {
  const errors: OptionValidationError[] = []

  if (!VALID_ID_REGEX.test(colorId)) {
    errors.push({
      message: `Color id "${colorId}" is not a valid JavaScript identifier (must start with a letter, underscore or $, followed by letters, digits, underscores or $). Color ids may not contain "." — that character is reserved for shade-qualified ids (e.g. "red.300").`,
      optionKey: colorId,
    })
  }

  if (!isNonEmptyString(option.label)) {
    errors.push({
      message: `Option "${colorId}" is missing a non-empty "label".`,
      optionKey: colorId,
    })
  }

  if (hasShades(option)) {
    const shadeKeys = Object.keys(option.shades)

    if (shadeKeys.length === 0) {
      errors.push({
        message: `Option "${colorId}" declares an empty "shades" object. Either omit "shades" or declare at least one shade.`,
        optionKey: colorId,
      })
    }

    for (const shadeKey of shadeKeys) {
      const shadeValue = option.shades[shadeKey]
      if (!isHex(shadeValue)) {
        errors.push({
          message: `Option "${colorId}" shade "${shadeKey}" has value "${shadeValue}" which is not a valid hex color (expected format: #RRGGBB or #RGB)`,
          optionKey: colorId,
        })
      }
    }

    if (!isNonEmptyString(option.mainShade)) {
      errors.push({
        message: `Option "${colorId}" declares "shades" but is missing "mainShade".`,
        optionKey: colorId,
      })
    } else if (!shadeKeys.includes(option.mainShade)) {
      errors.push({
        message: `Option "${colorId}" mainShade "${option.mainShade}" is not a key of shades (available: ${shadeKeys.map((k) => `"${k}"`).join(', ')})`,
        optionKey: colorId,
      })
    }

    if ('hex' in option) {
      errors.push({
        message: `Option "${colorId}" declares both "hex" and "shades". Use one or the other: shaded colors derive their base hex from "shades[mainShade]".`,
        optionKey: colorId,
      })
    }
  } else {
    const hex = (option as { hex?: unknown }).hex
    if (hex === undefined) {
      errors.push({
        message: `Option "${colorId}": "hex" is required when "shades" is not provided.`,
        optionKey: colorId,
      })
    } else if (!isHex(hex)) {
      errors.push({
        message: `Option "${colorId}" has hex value "${hex}" which is not a valid hex color (expected format: #RRGGBB or #RGB)`,
        optionKey: colorId,
      })
    }
  }

  return errors
}

/**
 * Validate all colorOptions entries.
 */
export function validateColorOptions(
  colorOptions: Record<string, ColorOption> | undefined,
): OptionValidationError[] {
  if (!colorOptions) {
    return []
  }

  const errors: OptionValidationError[] = []

  for (const [colorId, option] of Object.entries(colorOptions)) {
    if (!option || typeof option !== 'object') {
      continue
    }
    errors.push(...validateColorOption(colorId, option))
  }

  return errors
}
