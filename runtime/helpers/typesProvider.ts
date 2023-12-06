import {
  DraggableExistingBlokkliItem,
  BlokkliAvailableType,
  BlokkliItemType,
} from '../types'
import { onlyUnique } from '#blokkli/helpers'
import { eventBus } from '#blokkli/helpers/eventBus'
import { BlokkliAdapter, BlokkliAdapterContext } from '../adapter'

export type BlokkliTypesProvider = {
  itemBundlesWithNested: ComputedRef<string[]>
  allowedTypesInList: ComputedRef<string[]>
  allTypes: ComputedRef<BlokkliItemType[]>
  allowedTypes: ComputedRef<BlokkliAvailableType[]>
}

export default async function (
  adapter: BlokkliAdapter<any>,
  blocks: ComputedRef<DraggableExistingBlokkliItem[]>,
  context: ComputedRef<BlokkliAdapterContext>,
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
    const hostFieldNames = blocks.value
      .map((v) => v.hostFieldName)
      .filter(onlyUnique)
    if (hostFieldNames.length === 1) {
      return allowedTypes.value
        .filter(
          (v) =>
            v.entityType === context.value.entityType &&
            v.bundle === context.value.entityBundle &&
            v.fieldName === hostFieldNames[0],
        )
        .flatMap((v) => v.allowedTypes)
        .filter(Boolean) as string[]
    }
    return []
  })

  watch(blocks, () => {
    if (blocks.value.length !== 1) {
      return
    }
    const item = blocks.value[0]
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
