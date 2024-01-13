import { computed, inject, type ComputedRef } from '#imports'
import type {
  BlockDefinitionInput,
  BlockDefinitionOptionsInput,
  DefineBlokkliContext,
  InjectedBlokkliItem,
  ItemEditContext,
} from '#blokkli/types'
import { globalOptionsDefaults } from '#blokkli/default-global-options'

import type {
  GlobalOptionsKey,
  ValidFieldListTypes,
} from '#blokkli/generated-types'
import {
  INJECT_BLOCK_ITEM,
  INJECT_EDIT_CONTEXT,
  INJECT_FIELD_LIST_TYPE,
  INJECT_REUSABLE_OPTIONS,
} from '../helpers/symbols'

/**
 * Define a blokkli component.
 */
export function defineBlokkli<
  T extends BlockDefinitionOptionsInput,
  G extends GlobalOptionsKey[] | undefined = undefined,
>(config: BlockDefinitionInput<T, G>): DefineBlokkliContext<T, G> {
  const optionKeys: string[] = []
  // The default options are provided by the component definition itself.
  const defaultOptions: Record<string, any> = {}
  for (const key in config.options) {
    optionKeys.push(key)
    if (config.options[key] && 'default' in config.options[key]) {
      defaultOptions[key] = config.options[key].default
    }
  }

  // If the item uses global options, we add the default values from the
  // global options to the default options of this item.
  if (config.globalOptions) {
    config.globalOptions.forEach((key) => {
      optionKeys.push(key)
      const defaultValue = (globalOptionsDefaults as any)[key as any]
      if (defaultValue !== undefined) {
        defaultOptions[key] = defaultValue
      }
    })
  }

  const fieldListType = inject<ComputedRef<ValidFieldListTypes>>(
    INJECT_FIELD_LIST_TYPE,
    computed(() => 'default'),
  )!

  // Inject the data from the BlokkliItem component.
  const item = inject<InjectedBlokkliItem>(INJECT_BLOCK_ITEM)
  const uuid = item?.value.uuid || ''
  const index =
    item?.value.index !== undefined ? item.value.index : computed(() => 0)

  const parentType = computed(() => item?.value.parentType)

  // This is injected by the "from_library" blokkli component.
  // If its present it means this blokkli is reusable. In this case it
  // inherits the options defined on its wrapper blokkli.
  const fromLibraryOptions = inject<ComputedRef<Record<string, string>> | null>(
    INJECT_REUSABLE_OPTIONS,
    null,
  )

  // When we are in an edit context, the current options are managed in a
  // separate reactive state. This state is mutated when the user is changing
  // the options. These options are only persisted once the user closes the
  // options popup. In order to have live preview of how these options affect
  // the component, we use this state to override the options.
  const editContext = inject<ItemEditContext | null>(INJECT_EDIT_CONTEXT, null)

  const options = computed(() => {
    if (config.bundle === 'from_library') {
      return {
        ...(item?.value.options || {}),
        ...(editContext?.mutatedOptions.value[uuid] || {}),
      }
    }
    const result = optionKeys.reduce<Record<string, string>>((acc, key) => {
      // Use an override option if available.
      if (editContext) {
        const overrideOptions = editContext.mutatedOptions.value[uuid] || {}

        if (overrideOptions[key] !== undefined) {
          acc[key] = overrideOptions[key]
          return acc
        }
      }

      if (fromLibraryOptions) {
        if (fromLibraryOptions.value[key] !== undefined) {
          acc[key] = fromLibraryOptions.value[key]
          return acc
        }
      }

      if (item?.value.options && item.value.options[key] !== undefined) {
        // Use the persisted option value on the item itself.
        acc[key] = item.value.options[key]
        return acc
      }

      // Fallback to the default defined by the component.
      acc[key] = defaultOptions[key]
      return acc
    }, {})

    return result
  })
  return {
    uuid,
    index,
    options,
    isEditing: !!item?.value.isEditing,
    parentType,
    fieldListType,
  } as any
}
