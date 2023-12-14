import { type ComputedRef, computed, watch } from 'vue'
import type { BlokkliAvailableType, BlokkliItemType } from '../types'
import { eventBus } from '#blokkli/helpers/eventBus'
import type { BlokkliAdapter } from '../adapter'
import type { BlokkliSelectionProvider } from './selectionProvider'

export type BlokkliTypesProvider = {
  itemBundlesWithNested: ComputedRef<string[]>
  allowedTypesInList: ComputedRef<string[]>
  allTypes: ComputedRef<BlokkliItemType[]>
  allowedTypes: ComputedRef<BlokkliAvailableType[]>
}

export default async function (
  adapter: BlokkliAdapter<any>,
  selection: BlokkliSelectionProvider,
): Promise<BlokkliTypesProvider> {
  const allTypesData = await adapter.getAllTypes()
  const allTypes = computed(() => allTypesData || [])
  const allowedTypesData = await adapter.getAvailableTypes()
  const allowedTypes = computed(() => allowedTypesData || [])
  const itemEntityType = useRuntimeConfig().public.blokkli.itemEntityType

  /**
   * The allowed bundles in the current field item list.
   *
   * This always uses the selected item's parent field to determine the allowed types.
   */
  const allowedTypesInList = computed(() => {
    if (selection.blocks.value.length === 1) {
      const block = selection.blocks.value[0]
      return allowedTypes.value
        .filter(
          (v) =>
            v.entityType === block.hostType &&
            v.bundle === block.hostBundle &&
            v.fieldName === block.hostFieldName,
        )
        .flatMap((v) => v.allowedTypes)
        .filter(Boolean) as string[]
    }
    return []
  })

  watch(selection.blocks, () => {
    if (selection.blocks.value.length !== 1) {
      return
    }
    const item = selection.blocks.value[0]
    // Determine if the selected item has nested items.
    const hasNested = itemBundlesWithNested.value.includes(item.itemBundle)
    if (hasNested) {
      // Get the nested item fields.
      const nestedFields =
        allowedTypes.value
          .filter(
            (v) =>
              v.entityType === itemEntityType && v.bundle === item.itemBundle,
          )
          .map((v) => v.fieldName) || []

      // When we have exactly one nested item field, we can set the active
      // field key to this field. That way the UI will show this field is active
      // and display available items for this field.
      if (nestedFields.length === 1) {
        eventBus.emit('setActiveFieldKey', `${item.uuid}:${nestedFields[0]}`)
        return
      }
    }
    eventBus.emit('setActiveFieldKey', `${item.hostUuid}:${item.hostFieldName}`)
  })

  /**
   * All item bundles that themselves have nested items.
   */
  const itemBundlesWithNested = computed<string[]>(() => {
    return (
      allowedTypes.value
        .filter((v) => v.entityType === itemEntityType)
        .map((v) => v.bundle) || []
    )
  })

  return {
    itemBundlesWithNested,
    allowedTypesInList,
    allTypes,
    allowedTypes,
  }
}
