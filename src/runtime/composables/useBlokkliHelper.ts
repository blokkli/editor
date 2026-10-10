import {
  INJECT_EDIT_CONTEXT,
  INJECT_MUTATED_FIELDS_MAP,
  INJECT_PROVIDER_BLOCKS,
  INJECT_PROVIDER_CONTEXT,
} from '#blokkli/helpers/injections'
import {
  inject,
  type ComputedRef,
  computed,
  watch,
  ref,
  toValue,
} from '#imports'
import type { MaybeRefOrGetter } from 'vue'
import { FIELD_MAPPING } from '#blokkli-build/runtime-options'
import type { FieldListItemTyped } from '#blokkli-build/generated-types'
import {
  getActualBlock,
  isVisibleByOptions,
} from '#blokkli/helpers/runtimeHelpers'
import type { MutatedField } from '#blokkli/editor/types/state'
import type { fromLibraryBlockBundle } from '#blokkli-build/config'

type BundleWithoutLibrary = Exclude<
  FieldListItemTyped['bundle'],
  typeof fromLibraryBlockBundle
>

type CallbackResult =
  | { include: boolean; continueChildren?: boolean }
  | undefined
  | null

type BundlesOrCallback<T> = T[] | ((item: FieldListItemTyped) => CallbackResult)

type UseBlokkliHelper = {
  /**
   * Iterates over the all blocks of the current field and returns a flat array
   * of matching block bundles.
   */
  queryBlocks<K extends BundleWithoutLibrary>(
    bundles: K[],
    providedList?: MaybeRefOrGetter<FieldListItemTyped[] | undefined>,
  ): ComputedRef<Extract<FieldListItemTyped, { bundle: K }>[]>

  queryBlocks(
    bundles: (item: FieldListItemTyped) => CallbackResult,
    providedList?: MaybeRefOrGetter<FieldListItemTyped[] | undefined>,
  ): ComputedRef<FieldListItemTyped[]>
}

/**
 * Walks an array of field list items and pushes the ones that match the
 * callback into matches.
 *
 * Outside the editor, it skips the blocks <BlokkliField> doesn't render
 * (unpublished, hidden globally, not visible in the language). While editing,
 * <BlokkliField> renders them all.
 *
 * @param matches - The items that match the callback.
 * @param callback - The method called for every item. If it returns false, its not included and its children are ignored.
 */
function walkBlocks(
  matches: FieldListItemTyped[],
  callback: (item: FieldListItemTyped) => CallbackResult,
  mutatedOptions: Record<string, any>,
  language: string | undefined,
  mutatedFieldsMap?: Record<string, MutatedField | undefined> | null,
  list?: Array<
    FieldListItemTyped | null | undefined | object | string | number | boolean
  >,
) {
  if (!list) return

  for (let i = 0; i < list.length; i++) {
    const item = list[i]

    // Items can be nullalbe or any other type.
    if (!item || typeof item !== 'object') continue

    // Make sure we're actually dealing with the correct object type, in case field mapping is wrong.
    if (!('bundle' in item) || !('uuid' in item)) continue

    if (
      !mutatedFieldsMap &&
      !(item.isVisible && isVisibleByOptions(item, language))
    ) {
      continue
    }

    // This handles 'from_library' blocks and returns the reusable block with
    // its options merged.
    const mutatedOptionsForBlock = mutatedOptions[item.uuid] ?? {}
    const mappedItem = getActualBlock({
      ...item,
      options: { ...(item.options || {}), ...mutatedOptionsForBlock },
    })
    if (!mappedItem) continue

    const callbackResult = callback(mappedItem)
    if (callbackResult === null || callbackResult === undefined) {
      // Returning null or undefined => skip entire block.
      continue
    } else if (callbackResult.include) {
      matches.push(mappedItem)
    }

    // By default, continue walking child blocks, unless explicitly disabled.
    if (callbackResult.continueChildren === false) {
      continue
    }

    // The mapping contains prop properties of blocks that can contain nested
    // blocks.
    const nestedFieldMapping = FIELD_MAPPING[mappedItem.bundle]
    if (!nestedFieldMapping) continue
    if (!('props' in mappedItem) || !mappedItem.props) continue

    // Iterate over props that contain children.
    const propNames = Object.keys(nestedFieldMapping)
    for (const propName of propNames) {
      const mapping = nestedFieldMapping[propName]
      if (!mapping) continue
      if (mapping[0] !== 'field') continue
      const key = mappedItem.uuid + ':' + mapping[1]
      const value = mutatedFieldsMap
        ? mutatedFieldsMap[key]?.list
        : (mappedItem.props as any)?.[propName]

      if (!value) continue

      // A prop may be an array or a single field list item.
      const valueAsArray = Array.isArray(value) ? value : [value]

      walkBlocks(
        matches,
        callback,
        mutatedOptions,
        language,
        mutatedFieldsMap,
        valueAsArray,
      )
    }
  }
}

export function useBlokkliHelper(): UseBlokkliHelper {
  const rootBlocks = inject(INJECT_PROVIDER_BLOCKS, null)
  const providerEntity = inject(INJECT_PROVIDER_CONTEXT, null)

  const editContext = inject(INJECT_EDIT_CONTEXT, null)
  const mutatedOptions = ref<Record<string, any>>({})

  const mutatedFields = inject(INJECT_MUTATED_FIELDS_MAP, null)

  // @todo: This is a dirty workaround during editing. The mutatedOptions
  // from editContext are not reactive when used in a computed property.
  // Because of that, we need to what the entire object and assign it to a
  // ref here.
  // We need a better solution here, because this is rather inefficient.
  if (editContext?.mutatedOptions) {
    watch(editContext.mutatedOptions, (options) => {
      mutatedOptions.value = options
    })
  }

  function queryBlocks(
    bundlesOrCallback: BundlesOrCallback<any>,
    providedList?: MaybeRefOrGetter<FieldListItemTyped[] | undefined>,
  ): ComputedRef<FieldListItemTyped[]> {
    const callback =
      typeof bundlesOrCallback === 'function'
        ? bundlesOrCallback
        : (item: FieldListItemTyped): CallbackResult => {
            if (bundlesOrCallback.includes(item.bundle)) {
              return {
                include: true,
                continueChildren: true,
              }
            }

            return {
              include: false,
              continueChildren: true,
            }
          }

    return computed(() => {
      const matches: FieldListItemTyped[] = []
      const list = toValue(providedList) ?? rootBlocks?.value

      if (!list) {
        console.error(
          '[blökkli] - Failed to inject rootBlocks in queryBlocks. Automatic injection is only available when the useBlokkliHelper composable is called in a component inside <BlokkliField>. If this is not the case, pass the FieldListItemTyped array as the second argument to queryBlocks.',
        )
        return []
      }

      walkBlocks(
        matches,
        callback,
        mutatedOptions.value,
        providerEntity?.value.language,
        mutatedFields,
        list,
      )

      return matches
    })
  }

  return {
    queryBlocks,
  }
}
