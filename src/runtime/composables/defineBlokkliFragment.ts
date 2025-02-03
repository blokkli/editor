import { INJECT_FRAGMENT_CONTEXT } from '../helpers/symbols'
import { getRuntimeOptionValue } from '../helpers/runtimeHelpers'
import { computed, inject } from '#imports'
import type {
  BlockDefinitionOptionsInput,
  DefineBlokkliContext,
  FragmentDefinitionInput,
} from '#blokkli/types'
import type { GlobalOptionsKey } from '#blokkli/generated-types'
import { globalOptionsDefaults } from '#blokkli/default-global-options'

export function defineBlokkliFragment<
  T extends BlockDefinitionOptionsInput = BlockDefinitionOptionsInput,
  G extends GlobalOptionsKey[] | undefined = undefined,
>(config: FragmentDefinitionInput<T, G>): DefineBlokkliContext<T, G> {
  // Provided by the <BlokkliFragment> component.
  const ctx = inject<DefineBlokkliContext<T, G> | null>(
    INJECT_FRAGMENT_CONTEXT,
    null,
  )
  const optionKeys: string[] = [
    ...Object.keys(config.options || {}),
    ...(config.globalOptions || []),
  ]

  const options = computed(() => {
    const result = optionKeys.reduce<
      Record<string, string | boolean | string[] | number>
    >((acc, key) => {
      acc[key] = ctx!.options.value[key]
      return acc
    }, {})

    // Map the values to the runtime value.
    optionKeys.forEach((key) => {
      const definition = config.options?.[key] || globalOptionsDefaults[key]
      if (!definition) {
        return
      }
      const value =
        result[key] === undefined || result[key] === null
          ? definition.default
          : result[key]
      result[key] = getRuntimeOptionValue(definition, value)
    })

    return result
  })

  return { ...ctx, options } as any
}
