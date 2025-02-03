import {
  INJECT_BLOCK_ITEM,
  INJECT_EDIT_CONTEXT,
  INJECT_FIELD_LIST_BLOCKS,
  INJECT_FIELD_LIST_TYPE,
  INJECT_REUSABLE_OPTIONS,
  INJECT_PROVIDER_BLOCKS,
} from '../helpers/symbols'
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
  FieldListItemTyped,
  GlobalOptionsKey,
  ValidFieldListTypes,
} from '#blokkli/generated-types'
import { getRuntimeOptionValue } from '#blokkli/helpers/runtimeHelpers'

/**
 * Define a blokkli component.
 */
export function defineBlokkli<
  T extends BlockDefinitionOptionsInput = BlockDefinitionOptionsInput,
  G extends GlobalOptionsKey[] | undefined = undefined,
>(config: BlockDefinitionInput<T, G>): DefineBlokkliContext<T, G> {
  const optionKeys: string[] = [
    ...Object.keys(config.options || {}),
    ...(config.globalOptions || []),
  ]

  const fieldListType = inject<ComputedRef<ValidFieldListTypes>>(
    INJECT_FIELD_LIST_TYPE,
    computed(() => 'default'),
  )!

  // All blocks in the same field as this block.
  const siblings = inject<ComputedRef<FieldListItemTyped[]>>(
    INJECT_FIELD_LIST_BLOCKS,
    computed(function () {
      return []
    }),
  )!

  // All blocks in the root field.
  const rootBlocks = inject<ComputedRef<FieldListItemTyped[]>>(
    INJECT_PROVIDER_BLOCKS,
    computed(function () {
      return []
    }),
  )!

  // Inject the data from the BlokkliItem component.
  const item = inject<InjectedBlokkliItem | null>(INJECT_BLOCK_ITEM, null)
  const uuid = item?.value.uuid || ''
  const index =
    item?.value.index !== undefined ? item.value.index : computed(() => 0)

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
    // For these two "special" bundles, at this stage we just return the raw
    // options defined on the item itself and the mutated options of the item.
    // These options will never be directly returned in defineBlokkli().
    // For example the from_library block renders the "actual" block again, at
    // which point this computed property is built again.
    if (
      config.bundle === 'from_library' ||
      config.bundle === 'blokkli_fragment'
    ) {
      return {
        ...(item?.value.options || {}),
        ...(editContext?.mutatedOptions[uuid] || {}),
      }
    }

    const result = optionKeys.reduce<
      Record<string, string | boolean | string[] | number>
    >((acc, key) => {
      // Use an override option if available.
      if (editContext) {
        const overrideOptions = editContext.mutatedOptions[uuid] || {}

        if (overrideOptions[key] !== undefined) {
          acc[key] = overrideOptions[key]
          return acc
        }
      }

      // Use the option inherited from the "from_library" block if this block is reusable.
      if (fromLibraryOptions && fromLibraryOptions.value[key] !== undefined) {
        acc[key] = fromLibraryOptions.value[key]
        return acc
      }

      if (item?.value.options && item.value.options[key] !== undefined) {
        // Use the persisted option value on the item itself.
        acc[key] = item.value.options[key]
        return acc
      }

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

  // The parent block type if this block is nested.
  const parentType = computed(() => item?.value.parentType)

  const isEditing = !!item?.value.isEditing

  return {
    uuid,
    index,
    // Must be cast because type of options is inferred automatically.
    options: options as any,
    isEditing,
    parentType,
    fieldListType,
    siblings,
    rootBlocks,
  }
}
