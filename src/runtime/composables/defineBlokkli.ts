import {
  INJECT_BLOCK_ITEM,
  INJECT_EDIT_CONTEXT,
  INJECT_FIELD_LIST_BLOCKS,
  INJECT_FIELD_LIST_TYPE,
  INJECT_REUSABLE_OPTIONS,
  INJECT_PROVIDER_BLOCKS,
  INJECT_PROVIDER_CONTEXT,
  INJECT_FIELD_PROXY_MODE,
  INJECT_FIELD_USES_PROXY,
} from '../helpers/symbols'
import { computed, inject, type ComputedRef } from '#imports'
import type {
  BlockDefinitionInput,
  BlockDefinitionOptionsInput,
  BlokkliProviderEntityContext,
  BundleKey,
  DefineBlokkliContext,
  InjectedBlokkliItem,
  ItemEditContext,
} from '#blokkli/types'
import type {
  FieldListItemTyped,
  GlobalOptionsKey,
  ValidFieldListTypes,
} from '#blokkli-build/generated-types'
import { getRuntimeOptionValue } from '#blokkli/helpers/runtimeHelpers'
import {
  OPTIONS,
  type RuntimeBlockOptionArray,
} from '#blokkli-build/runtime-options'
import { useBlockRegistration } from '#blokkli/helpers/composables/useBlockRegistration'

/**
 * Define a blokkli component.
 */
export function defineBlokkli<
  T extends BlockDefinitionOptionsInput = BlockDefinitionOptionsInput,
  G extends GlobalOptionsKey[] | undefined = undefined,
  B extends BundleKey | string = string,
>(arg: BlockDefinitionInput<T, G, B>): DefineBlokkliContext<T, G> {
  // The vite plugin replaces the object that is passed in defineBlokkli()
  // with a single string, which is the bundle and the unique identifier
  // separated using ::.
  const [bundle, identifier] = (arg as unknown as string).split('::', 2) as [
    string,
    string,
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
  const item = inject<ComputedRef<InjectedBlokkliItem> | null>(
    INJECT_BLOCK_ITEM,
    null,
  )
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

  const provider = inject<ComputedRef<BlokkliProviderEntityContext | null>>(
    INJECT_PROVIDER_CONTEXT,
    computed(() => null),
  )

  // The parent block type if this block is nested.
  const parentType = computed(() => item?.value.parentType)

  const isEditing = !!item?.value.isEditing

  const options = computed(() => {
    // For these two "special" bundles, at this stage we just return the raw
    // options defined on the item itself and the mutated options of the item.
    // These options will never be directly returned in defineBlokkli().
    // For example the from_library block renders the "actual" block again, at
    // which point this computed property is built again.
    if (bundle === 'from_library') {
      return {
        ...(item?.value.options || {}),
        ...(editContext?.mutatedOptions[uuid] || {}),
      }
    }

    // The key to use for getting the block options.
    // For fragments, the fragment name is injected by the blokkli_fragment
    // component.
    const optionKey =
      bundle === 'blokkli_fragment'
        ? 'fragment:' + item?.value.fragmentName + '__default'
        : identifier

    const runtimeOptionDefinitions =
      (editContext?.definitions.runtimeOptions.value || OPTIONS)[optionKey] ||
      {}

    const result = Object.entries(runtimeOptionDefinitions).reduce<
      Record<string, string | boolean | string[] | number | undefined>
    >((acc, [key, v]) => {
      const definition = v as unknown as RuntimeBlockOptionArray

      // Use an override option if available.
      if (editContext) {
        const overrideOptions = editContext.mutatedOptions[uuid] || {}

        if (
          overrideOptions[key] !== undefined &&
          overrideOptions[key] !== null
        ) {
          acc[key] = getRuntimeOptionValue(definition, overrideOptions[key])
          return acc
        }
      }

      // Use the option inherited from the "from_library" block if this block is reusable.
      if (
        fromLibraryOptions &&
        fromLibraryOptions.value[key] !== undefined &&
        fromLibraryOptions.value[key] !== null
      ) {
        acc[key] = getRuntimeOptionValue(
          definition,
          fromLibraryOptions.value[key],
        )
        return acc
      }

      if (
        item?.value.options &&
        item.value.options[key] !== undefined &&
        item.value.options[key] !== null
      ) {
        // Use the persisted option value on the item itself.
        acc[key] = getRuntimeOptionValue(definition, item.value.options[key])
        return acc
      }

      // Use the default value.
      acc[key] = definition[1]

      return acc
    }, {})

    return result
  })

  if (import.meta.hot) {
    import.meta.hot.accept('#blokkli-build/runtime-options', () => {})
    import.meta.hot.accept('#blokkli/helpers/runtimeHelpers', () => {})
  }

  if (
    editContext?.useBlockRegistration &&
    editContext.dom &&
    bundle !== 'from_library' &&
    bundle !== 'blokkli_fragment'
  ) {
    const isProxyMode = inject(INJECT_FIELD_USES_PROXY, false)
    if (!isProxyMode) {
      editContext.useBlockRegistration(editContext.dom, uuid)
    }
  }

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
    provider,
  }
}
