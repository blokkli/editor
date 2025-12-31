import type { BlokkliIcon } from '#blokkli-build/icons'
import type { AdapterSearchArguments } from '#blokkli/editor/adapter'
import type { PluginConfigInput } from '#blokkli/editor/types/pluginConfig'
import type { DraggableHostData } from '#blokkli/types'

export type MediaLibraryItem = {
  mediaId: string
  label: string
  context: string
  targetBundles: string[]
  thumbnail?: string
  icon?: BlokkliIcon
  mediaBundle?: string
}

export interface DraggableMediaLibraryItem {
  itemType: 'media_library'
  element: () => HTMLElement
  itemBundles: string[]
  mediaId: string
  mediaBundle: string
}

export type MediaLibraryAddBlockEvent = {
  host: DraggableHostData
  preceedingUuid: string | null
  item: DraggableMediaLibraryItem
  targetBundle: string
}

export type MediaLibraryAddBlocksEvent = {
  host: DraggableHostData
  preceedingUuid: string | null
  targetBundle: string
  items: DraggableMediaLibraryItem[]
}

export type MediaLibraryReplaceMediaEvent = {
  /**
   * The UUID of the block on which the media was dropped.
   */
  host: DraggableHostData

  /**
   * The ID of the media that was dropped.
   */
  mediaId: string
}

export type FilterTypes = 'checkbox' | 'checkboxes' | 'text' | 'select'

// Extend MediaLibraryGetResults to be generic
export type MediaLibraryGetResults = {
  filters: PluginConfigInput[]
  items: MediaLibraryItem[]
  total: number
  perPage: number
}

export type GetMediaLibraryFunction = (
  e: AdapterSearchArguments,
) => Promise<MediaLibraryGetResults>

declare module '#blokkli/editor/adapter' {
  interface BlokkliAdapter<T> {
    /**
     * Return the media library results and filters using the given selected filter.
     */
    mediaLibraryGetResults?: GetMediaLibraryFunction

    /**
     * Create a new block from the given media library item.
     */
    mediaLibraryAddBlock?: (
      e: MediaLibraryAddBlockEvent,
    ) => Promise<MutationResponseLike<T>> | undefined

    /**
     * Create new blocks from the given media library items.
     */
    mediaLibraryAddBlocks?: (
      e: MediaLibraryAddBlocksEvent,
    ) => Promise<MutationResponseLike<T>> | undefined

    /**
     * Replace an existing media from a block with a new one.
     *
     * This method is called when the user drag and drops an item from the media
     * library onto an v-blokkli-droppable element.
     */
    mediaLibraryReplaceMedia?: (
      e: MediaLibraryReplaceMediaEvent,
    ) => Promise<MutationResponseLike<T>> | undefined

    /**
     * Replace an existing media on a field of the page entity.
     *
     * This method is called when the user drag and drops an item from the media
     * library onto an v-blokkli-droppable element where the host is the page entity..
     */
    mediaLibraryReplaceEntityMedia?: (
      e: MediaLibraryReplaceMediaEvent,
    ) => Promise<MutationResponseLike<T>> | undefined
  }
}
