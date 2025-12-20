import {
  INJECT_BLOCK_ITEM,
  INJECT_EDIT_CONTEXT,
  INJECT_FIELD_LIST_BLOCKS,
  INJECT_FIELD_LIST_TYPE,
  INJECT_REUSABLE_OPTIONS,
  INJECT_PROVIDER_BLOCKS,
  INJECT_PROVIDER_CONTEXT,
  INJECT_FIELD_USES_PROXY,
  INJECT_REUSABLE_UUID,
} from '../helpers/injections'
import { computed, inject } from '#imports'
import type {
  BlockDefinitionInput,
  BlockDefinitionOptionsInput,
  BlokkliProviderEntityContext,
  BundleKey,
  DefineBlokkliContext,
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
import {
  BUNDLE_BLOKKLI_FRAGMENT,
  BUNDLE_FROM_LIBRARY,
} from '#blokkli/constants'

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

  const fieldListType = inject(
    INJECT_FIELD_LIST_TYPE,
    () => computed(() => 'default' as ValidFieldListTypes),
    true,
  )!

  // All blocks in the same field as this block.
  const siblings = inject(
    INJECT_FIELD_LIST_BLOCKS,
    () =>
      computed(function () {
        return [] as FieldListItemTyped[]
      }),
    true,
  )!

  // All blocks in the root field.
  const rootBlocks = inject(
    INJECT_PROVIDER_BLOCKS,
    () =>
      computed(function () {
        return [] as FieldListItemTyped[]
      }),
    true,
  )!

  // Inject the data from the BlokkliItem component.
  const item = inject(INJECT_BLOCK_ITEM, null)
  const uuid = item?.value.uuid || ''
  const index =
    item?.value.index !== undefined ? item.value.index : computed(() => 0)

  // This is injected by the "from_library" blokkli component.
  // If its present it means this blokkli is reusable. In this case it
  // inherits the options defined on its wrapper blokkli.
  const fromLibraryOptions = inject(INJECT_REUSABLE_OPTIONS, null)

  const reusableUuid = inject(INJECT_REUSABLE_UUID, null)

  // When we are in an edit context, the current options are managed in a
  // separate reactive state. This state is mutated when the user is changing
  // the options. These options are only persisted once the user closes the
  // options popup. In order to have live preview of how these options affect
  // the component, we use this state to override the options.
  const editContext = inject(INJECT_EDIT_CONTEXT, null)

  const provider = inject(
    INJECT_PROVIDER_CONTEXT,
    () => computed(() => null as BlokkliProviderEntityContext | null),
    true,
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
    if (bundle === BUNDLE_FROM_LIBRARY) {
      return {
        ...(item?.value.options || {}),
        ...(editContext?.mutatedOptions[uuid] || {}),
      }
    }

    // The key to use for getting the block options.
    // For fragments, the fragment name is injected by the blokkli_fragment
    // component.
    const optionKey =
      bundle === BUNDLE_BLOKKLI_FRAGMENT
        ? 'fragment:' + item?.value.fragmentName
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
    bundle !== BUNDLE_FROM_LIBRARY &&
    bundle !== BUNDLE_BLOKKLI_FRAGMENT
  ) {
    const isProxyMode = inject(INJECT_FIELD_USES_PROXY, false)
    if (!isProxyMode) {
      // The block registration is always done by the "actual" block in case of reusable blocks.
      // For this reason we use the injected UUID of the from_library block for the registration.
      editContext.useBlockRegistration(editContext.dom, reusableUuid ?? uuid)
    }
  }

  return {
    uuid,
    index,
    options: options as DefineBlokkliContext<T, G>['options'],
    isEditing,
    parentType,
    fieldListType,
    siblings,
    rootBlocks,
    provider,
  }
}
