import { DraggableExistingParagraphItem } from '../types'
import { PbAdapter } from '../types/adapter'
import { onlyUnique } from '#pb/helpers'
import { eventBus } from '../eventBus'

export default async function (
  adapter: PbAdapter<any>,
  selectedParagraphs: ComputedRef<DraggableExistingParagraphItem[]>,
  entityType: string,
  bundle: string,
) {
  const { data: allTypesData } = await useLazyAsyncData(() =>
    adapter.getAllParagraphTypes(),
  )
  const allTypes = computed(() => allTypesData.value || [])

  const { data: allowedTypesData } = await useLazyAsyncData(() =>
    adapter.getAvailableParagraphTypes(),
  )
  const allowedTypes = computed(() => allowedTypesData.value || [])

  /**
   * The allowed paragraph types in the current field item list.
   *
   * Unlike selectableParagraphTypes, this always uses the selected paragraphs's
   * parent field to determine the allowed types.
   */
  const allowedTypesInList = computed(() => {
    const hostFieldNames = selectedParagraphs.value
      .map((v) => v.hostFieldName)
      .filter(onlyUnique)
    if (hostFieldNames.length === 1) {
      return allowedTypes.value
        .filter(
          (v) =>
            v.entityType === entityType &&
            v.bundle === bundle &&
            v.fieldName === hostFieldNames[0],
        )
        .flatMap((v) => v.allowedTypes)
        .filter(Boolean) as string[]
    }
    return []
  })

  watch(selectedParagraphs, () => {
    if (selectedParagraphs.value.length !== 1) {
      return
    }
    const item = selectedParagraphs.value[0]
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
