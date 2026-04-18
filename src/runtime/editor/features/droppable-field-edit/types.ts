import type { BlokkliItemHost } from '#blokkli/editor/types/field'

export type DroppableFieldItem = {
  id: string
  entityType: string
  bundle: string
  label: string
  thumbnailSrc?: string
}

export type DroppableFieldGetItemsEvent = {
  host: BlokkliItemHost
}

export type DroppableFieldUpdateEvent = {
  host: BlokkliItemHost
  /**
   * The new ordered list of entity IDs the field should hold. Missing IDs are
   * removed; unknown IDs are attached.
   */
  itemIds: string[]
}

declare module '#blokkli/editor/adapter' {
  interface BlokkliAdapter<T> {
    /**
     * Get all items of a multi-value droppable field.
     */
    getDroppableFieldItems?: (
      e: DroppableFieldGetItemsEvent,
    ) => Promise<DroppableFieldItem[]>

    /**
     * Atomically update the items of a multi-value droppable field.
     *
     * `itemIds` is the complete desired state as an ordered list of entity
     * IDs. IDs already in the field are kept (and reordered); missing IDs are
     * removed; new IDs are attached.
     */
    updateDroppableField?: (
      e: DroppableFieldUpdateEvent,
    ) => Promise<MutationResponseLike<T>>
  }
}
