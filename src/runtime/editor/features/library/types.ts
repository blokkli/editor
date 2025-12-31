import type { BlokkliAdapterSearchResults } from '#blokkli/editor/adapter'
import type { DraggableHostData, FieldListItem } from '#blokkli/types'

export type MakeReusableEvent = {
  label: string
  uuid: string
}

export type DetachReusableBlockEvent = {
  uuids: string[]
}

export type BlokkliAdapterGetLibraryItemsData = {
  bundles: string[]
  page: number
  filters: Record<string, any>
}

export interface LibraryItem {
  uuid: string
  label?: string
  bundle: string
  item: FieldListItem
}

export type BlokkliAdapterGetLibraryItemsResult =
  BlokkliAdapterSearchResults<LibraryItem>

export type LibraryEditItemEvent = {
  url: string
  uuid: string
  label?: string
}

export type AddReusableItemEvent = {
  libraryItemUuid: string
  host: DraggableHostData
  afterUuid: string | null
}

export interface DraggableReusableItem {
  itemType: 'reusable'
  element: () => HTMLElement
  itemBundle: string
  libraryItemUuid: string
}

declare module '#blokkli/editor/adapter' {
  interface BlokkliAdapter<T> {
    /**
     * Make an item reusable.
     */
    makeBlockReusable?: (
      e: MakeReusableEvent,
    ) => Promise<MutationResponseLike<T>>

    /**
     * Detach a reusable block and add a copy of it in place.
     */
    detachReusableBlock?: (
      e: DetachReusableBlockEvent,
    ) => Promise<MutationResponseLike<T>>

    /**
     * Get all library items.
     */
    getLibraryItems?: (
      data: BlokkliAdapterGetLibraryItemsData,
    ) => Promise<BlokkliAdapterGetLibraryItemsResult>

    /**
     * Add a reusable item.
     */
    addLibraryItem?: (
      e: AddReusableItemEvent,
    ) => Promise<MutationResponseLike<T>>

    /**
     * Build the URL to edit a library item.
     */
    getLibraryItemEditUrl?: (uuid: string) => string
  }
}

declare module '#blokkli/editor/types/draggable' {
  interface DraggableItemTypes {
    reusable: DraggableReusableItem
  }
}
