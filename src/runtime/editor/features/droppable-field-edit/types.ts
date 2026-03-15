import type { BlokkliItemHost } from '#blokkli/editor/types/field'

export type DroppableFieldItem = {
  uuid: string
  entityType: string
  bundle: string
  label: string
  thumbnailSrc?: string
}

export type DroppableFieldUpdateItem =
  | { type: 'existing'; uuid: string }
  | { type: 'new'; mediaId: string }

export type DroppableFieldGetItemsEvent = {
  host: BlokkliItemHost
}

export type DroppableFieldUpdateEvent = {
  host: BlokkliItemHost
  items: DroppableFieldUpdateItem[]
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
     * The items array represents the complete desired state: existing items by
     * UUID (order matters, missing = removed) and new items by mediaId
     * (position in array = insertion point).
     */
    updateDroppableField?: (
      e: DroppableFieldUpdateEvent,
    ) => Promise<MutationResponseLike<T>>
  }
}
