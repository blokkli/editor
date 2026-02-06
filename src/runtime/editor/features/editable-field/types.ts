import type { EntityTypeRestriction } from '#blokkli/editor/types/definitions'
import type { UpdateEntityFieldValueEvent } from '#blokkli/editor/adapter'

export type EditableFieldType = 'plain' | 'markup' | 'table' | 'frame'

export type EditableFieldConfig = {
  name: string
  entityType: string
  entityBundle: string
  label: string
  type: EditableFieldType
  required: boolean
  maxLength: number
}

export type DroppableFieldConfig = {
  type: 'reference' | 'link'
  name: string
  label: string
  entityType: string
  entityBundle: string
  allowed: EntityTypeRestriction[]
  cardinality: number
  required: boolean
}

export type UpdateFieldValueEvent = {
  uuid: string
  fieldName: string
  fieldValue: string
}

export type UpdateFieldValueBatchedEvent = {
  items: UpdateFieldValueEvent[]
  entityItems: UpdateEntityFieldValueEvent[]
}

type AdapterBuildEditableFrameUrl = {
  fieldName: string
  uuid?: string
}

declare module '#blokkli/editor/adapter' {
  interface BlokkliAdapter<T> {
    /**
     * Get the editable field configurations.
     */
    getEditableFieldConfig?: () => Promise<EditableFieldConfig[]>

    /**
     * Get the droppable field configurations.
     */
    getDroppableFieldConfig?: () => Promise<DroppableFieldConfig[]>

    /**
     * Update the value of a single block field.
     */
    updateFieldValue?: (
      e: UpdateFieldValueEvent,
    ) => Promise<MutationResponseLike<T>> | undefined

    /**
     * Update the value of a single entity field.
     */
    updateEntityFieldValue?: (
      e: UpdateEntityFieldValueEvent,
    ) => Promise<MutationResponseLike<T>> | undefined

    /**
     * Update the values of multiple block and entity fields in a single batch.
     */
    updateFieldValueBatched?: (
      e: UpdateFieldValueBatchedEvent,
    ) => Promise<MutationResponseLike<T>> | undefined

    /**
     * Build the iframe URL for an editable of type "frame".
     */
    buildEditableFrameUrl?: (
      e: AdapterBuildEditableFrameUrl,
    ) => string | undefined
  }
}
