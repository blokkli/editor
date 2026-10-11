import type {
  PluginConfigInput,
  PluginConfigInputCondition,
} from '#blokkli/editor/types/pluginConfig'

function holds(
  condition: PluginConfigInputCondition,
  values: Record<string, unknown>,
): boolean {
  const value = values[condition.name]
  return typeof condition.value === 'boolean'
    ? !!value === condition.value
    : value === condition.value
}

/**
 * Whether an input is shown, with the values the form's inputs have.
 */
export function isInputVisible(
  input: PluginConfigInput,
  values: Record<string, unknown>,
): boolean {
  return !input.visibleIf || holds(input.visibleIf, values)
}

/**
 * Whether an input needs a value, with the values the form's inputs have. One
 * that isn't shown needs none.
 */
export function isInputRequired(
  input: PluginConfigInput,
  values: Record<string, unknown>,
): boolean {
  if (!isInputVisible(input, values)) {
    return false
  }
  return (
    input.required || (!!input.requiredIf && holds(input.requiredIf, values))
  )
}
