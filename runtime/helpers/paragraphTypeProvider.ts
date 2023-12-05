import {
  DraggableExistingParagraphItem,
  PbAllowedBundle,
  PbType,
} from '../types'
import { onlyUnique } from '#blokkli/helpers'
import { eventBus } from '../eventBus'
import { PbAdapter, PbAdapterContext } from '../adapter'

export type PbTypesProvider = {
  paragraphTypesWithNested: ComputedRef<string[]>
  allowedTypesInList: ComputedRef<string[]>
  allTypes: ComputedRef<PbType[]>
  allowedTypes: ComputedRef<PbAllowedBundle[]>
}

export default async function (
  adapter: PbAdapter<any>,
  blocks: ComputedRef<DraggableExistingParagraphItem[]>,
  context: ComputedRef<PbAdapterContext>,
): Promise<PbTypesProvider> {
  const allTypesData = await adapter.getAllParagraphTypes()
  const allTypes = computed(() => allTypesData || [])
  const allowedTypesData = await adapter.getAvailableParagraphTypes()
  const allowedTypes = computed(() => allowedTypesData || [])

  /**
   * The allowed paragraph types in the current field item list.
   *
   * Unlike selectableParagraphTypes, this always uses the selected paragraphs's
   * parent field to determine the allowed types.
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
    // Determine if the selected paragraph has nested paragraphs.
    const hasNested = paragraphTypesWithNested.value.includes(
      item.paragraphType,
    )
    if (hasNested) {
      // Get the nested paragraph fields.
      const nestedFields =
        allowedTypes.value
          .filter(
            (v) =>
              v.entityType === 'paragraph' && v.bundle === item.paragraphType,
          )
          .map((v) => v.fieldName) || []

      // When we have exactly one nested paragraph field, we can set the active
      // field key to this field. That way the UI will show this field is active
      // and display available paragraphs for this field.
      if (nestedFields.length === 1) {
        eventBus.emit('setActiveFieldKey', `${item.uuid}:${nestedFields[0]}`)
        return
      }
    }
    eventBus.emit('setActiveFieldKey', `${item.hostUuid}:${item.hostFieldName}`)
  })

  /**
   * All paragraph types that themselves have nested paragraphs.
   */
  const paragraphTypesWithNested = computed<string[]>(() => {
    return (
      allowedTypes.value
        .filter((v) => v.entityType === 'paragraph')
        .map((v) => v.bundle) || []
    )
  })

  return {
    paragraphTypesWithNested,
    allowedTypesInList,
    allTypes,
    allowedTypes,
  }
}
