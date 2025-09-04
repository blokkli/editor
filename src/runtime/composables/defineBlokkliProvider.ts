import { computed, provide, useState } from '#imports'
import type {
  BlockDefinitionOptionsInput,
  DefineProviderContext,
  ProviderDefinitionInput,
} from '#blokkli/types'
import type { GlobalOptionsKey } from '#blokkli-build/generated-types'
import { INJECT_PROVIDER_KEY } from '#blokkli/helpers/symbols'
import {
  OPTIONS,
  type RuntimeBlockOptionArray,
} from '#blokkli-build/runtime-options'
import { getRuntimeOptionValue } from '#blokkli/helpers/runtimeHelpers'

type DefineBlokkliProviderProps =
  | {
      hostOptions?: any
    }
  | { blokkliProps: { hostOptions?: any } }

export function defineBlokkliProvider<
  T extends BlockDefinitionOptionsInput = BlockDefinitionOptionsInput,
  G extends GlobalOptionsKey[] | undefined = undefined,
>(
  props: DefineBlokkliProviderProps,
  _config: ProviderDefinitionInput<T, G>,
): DefineProviderContext<T, G> {
  const key = _config as unknown as string
  provide(INJECT_PROVIDER_KEY, key)

  const overrideOptions = useState<Record<string, string> | null>(
    'options:' + key,
    () => {
      return null
    },
  )

  const definitionKey = key.split('::')[1] ?? ''

  const runtimeOptionDefinitions = OPTIONS[definitionKey]

  const options = computed(() => {
    if (!runtimeOptionDefinitions) {
      return {}
    }

    // Also allow providing options from the Drupal BlokkliProps GraphQL type.
    const hostOptionsCurrent =
      ('blokkliProps' in props
        ? props.blokkliProps.hostOptions
        : props.hostOptions) ?? {}

    return Object.entries(runtimeOptionDefinitions).reduce<
      Record<string, string | boolean | string[] | number | undefined>
    >((acc, [key, v]) => {
      const definition = v as unknown as RuntimeBlockOptionArray

      // Use an override option if available.
      if (overrideOptions.value) {
        if (
          overrideOptions.value[key] !== undefined &&
          overrideOptions.value[key] !== null
        ) {
          acc[key] = getRuntimeOptionValue(
            definition,
            overrideOptions.value[key],
          )
          return acc
        }
      }

      if (
        hostOptionsCurrent &&
        hostOptionsCurrent[key] !== undefined &&
        hostOptionsCurrent[key] !== null
      ) {
        // Use the persisted option value on the item itself.
        acc[key] = getRuntimeOptionValue(definition, hostOptionsCurrent[key])
        return acc
      }

      // Use the default value.
      acc[key] = definition[1]

      return acc
    }, {})
  })

  return {
    // Must be cast because type of options is inferred automatically.
    options: options as any,
  }
}
