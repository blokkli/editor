import type { BlokkliAdapterSearchResults } from '#blokkli/editor/adapter'
import type { BlokkliItemHost } from '#blokkli/editor/types/field'
import type { FieldListItem } from '#blokkli/types/field'

export interface LibraryItemProps {
  block?: FieldListItem
  label?: string
  uuid?: string
  /**
   * The ID of the library item, e.g. for the URL of its page.
   */
  id?: string
}

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
  blockUuid: string
  label?: string
}

export type AdapterGetLibraryItemEditUrl = {
  libraryItemUuid: string
  libraryItemId: string | null
}

export type AddReusableItemEvent = {
  libraryItemUuid: string
  host: BlokkliItemHost
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
     *
     * Returns null when the URL can't be built, e.g. without the ID.
     */
    getLibraryItemEditUrl?: (e: AdapterGetLibraryItemEditUrl) => string | null
  }
}

declare module '#blokkli/editor/types/draggable' {
  interface DraggableItemTypes {
    reusable: DraggableReusableItem
  }
}

declare module '#blokkli/editor/events' {
  interface EventbusEvents {
    /**
     * Edit a library item.
     */
    'library:edit-item': LibraryEditItemEvent
  }
}

declare module '#blokkli/editor/types/permissions' {
  interface UserPermissionMap {
    create_library_item: 'Create new library items from existing blocks'
    edit_library_item: 'Edit library items.'
  }
}
