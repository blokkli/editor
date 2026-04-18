import type { BlokkliItemHost } from '#blokkli/editor/types/field'

export type DroppableFieldItem = {
  id: string
  entityType: string
  bundle: string
  label: string
  thumbnailSrc?: string
  /**
   * The block bundles that can be produced from this referenced entity when
   * dropped onto the page. Mirrors `MediaLibraryItem.targetBundles`.
   */
  targetBundles: string[]
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

export interface DraggableDroppableFieldItem {
  itemType: 'droppable_field_item'
  element: () => HTMLElement
  itemBundles: string[]
  entityId: string
  entityType: string
  entityBundle: string
  label: string
  thumbnailSrc?: string
}

export type AddEntityReferenceBlockEvent = {
  entityId: string
  entityType: string
  entityBundle: string
  host: BlokkliItemHost
  bundle: string
  afterUuid: string | null
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

    /**
     * Create a new block by referencing an existing entity.
     *
     * Generic counterpart to `mediaLibraryAddBlock` / `addContentSearchItem` —
     * all three route to the same Drupal `pbAddEntityReference` mutation.
     */
    addEntityReferenceBlock?: (
      e: AddEntityReferenceBlockEvent,
    ) => Promise<MutationResponseLike<T>> | undefined
  }
}

declare module '#blokkli/editor/types/draggable' {
  interface DraggableItemTypes {
    droppable_field_item: DraggableDroppableFieldItem
  }
}
