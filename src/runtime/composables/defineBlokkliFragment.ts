import {
  computed,
  getCurrentInstance,
  inject,
  onBeforeUnmount,
  onMounted,
} from '#imports'
import type {
  BlockDefinitionOptionsInput,
  DefineBlokkliContext,
  FragmentDefinitionInput,
  ItemEditContext,
} from '#blokkli/types'
import {
  INJECT_EDIT_CONTEXT,
  INJECT_FRAGMENT_CONTEXT,
} from '../helpers/symbols'
import type { GlobalOptionsKey } from '#blokkli/generated-types'
import { globalOptionsDefaults } from '#blokkli/default-global-options'
import { getRuntimeOptionValue } from '../helpers/runtimeHelpers'

export function defineBlokkliFragment<
  T extends BlockDefinitionOptionsInput = {},
  G extends GlobalOptionsKey[] | undefined = undefined,
>(config: FragmentDefinitionInput<T, G>): DefineBlokkliContext<T, G> {
  // Provided by the <BlokkliFragment> component.
  const ctx = inject<DefineBlokkliContext<T, G>>(INJECT_FRAGMENT_CONTEXT)!
  const editContext = inject<ItemEditContext | null>(INJECT_EDIT_CONTEXT, null)

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

  onMounted(() => {
    if (editContext) {
      // Block registration in defineBlokkli() is skipped for fragment blocks.
      // So we need to do it here.
      const instance = getCurrentInstance()
      editContext.dom.registerBlock(ctx.uuid, instance)
    }
  })

  onBeforeUnmount(() => {
    if (editContext && ctx.uuid) {
      editContext.dom.unregisterBlock(ctx.uuid)
    }
  })

  return { ...ctx, options } as any
}
