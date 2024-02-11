import { computed, inject } from '#imports'
import type {
  BlockDefinitionOptionsInput,
  DefineBlokkliContext,
  FragmentDefinitionInput,
} from '#blokkli/types'
import { INJECT_FRAGMENT_CONTEXT } from '../helpers/symbols'
import type { GlobalOptionsKey } from '#blokkli/generated-types'
import { globalOptionsDefaults } from '#blokkli/default-global-options'
import { getRuntimeOptionValue } from '../helpers/runtimeHelpers'

export function defineBlokkliFragment<
  T extends BlockDefinitionOptionsInput = {},
  G extends GlobalOptionsKey[] | undefined = undefined,
>(config: FragmentDefinitionInput<T, G>): DefineBlokkliContext<T, G> {
  // Provided by the <BlokkliFragment> component.
  const ctx = inject<DefineBlokkliContext<T, G>>(INJECT_FRAGMENT_CONTEXT)!

  const optionKeys: string[] = [
    ...Object.keys(config.options || {}),
    ...(config.globalOptions || []),
  ]

  const options = computed(() => {
    const result = optionKeys.reduce<
      Record<string, string | boolean | string[]>
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
