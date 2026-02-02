import type { BlockOptionDefinition } from '#blokkli/types/blockOptions'
import type { BlockDefinitionOptionsInput } from '#blokkli/types/definitions'

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

  return Object.entries({ ...options, ...global }).map(([property, option]) => ({
    property,
    option,
  }))
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
  if (blockMutatedOptions !== undefined && blockMutatedOptions[key] !== undefined) {
    return blockMutatedOptions[key]
  }
  return defaultValue
}
