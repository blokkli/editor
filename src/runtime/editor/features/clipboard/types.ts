import type { BlokkliItemHost } from '#blokkli/editor/types/field'
import type getVideoId from 'get-video-id'

export type AddClipboardItemEvent = {
  item: BlokkliClipboardItem
  blockBundle: string
  host: BlokkliItemHost
  afterUuid: string | null
}

interface ClipboardItemText {
  type: 'text'
  id: string
  itemBundle: string
  data: string
  additional?: string
}

export interface ClipboardItemVideo {
  type: 'video'
  id: string
  itemBundle: string
  data: string
  additional?: string
  videoService: ReturnType<typeof getVideoId>['service']
  videoId: string
}

interface ClipboardItemImage {
  type: 'image'
  id: string
  itemBundle: string
  data: string
  additional: string
  fileName: string
  fileSize: number
  fileType: string
}

export interface ClipboardItemFile {
  type: 'file'
  id: string
  itemBundle: string
  data: string
  additional: string
  fileName: string
  fileSize: number
  fileType: string
}

export type BlokkliClipboardItem =
  | ClipboardItemText
  | ClipboardItemVideo
  | ClipboardItemImage
  | ClipboardItemFile

export type PasteExistingBlocksEvent = {
  uuids: string[]
  host: BlokkliItemHost
  preceedingUuid: string | null
}

// Clipboard-specific event types
export type ClipboardMapBundleEventPlaintext = {
  type: 'plaintext'
  text: string
}

export type ClipboardMapBundleEventImage = {
  type: 'image'
  fileType: string
  fileSize: number
}

export type ClipboardMapBundleEventFile = {
  type: 'file'
  fileType: string
  fileSize: number
}

export type ClipboardMapBundleEventVideo = {
  type: 'video'
  videoService: ReturnType<typeof getVideoId>['service']
  videoId: string
}

export type ClipboardMapBundleEventLink = {
  type: 'link'
  url: string
}

export type ClipboardMapBundleEvent =
  | ClipboardMapBundleEventVideo
  | ClipboardMapBundleEventImage
  | ClipboardMapBundleEventFile
  | ClipboardMapBundleEventPlaintext
  | ClipboardMapBundleEventLink

export interface DraggableClipboardItem {
  itemType: 'clipboard'
  element: () => HTMLElement
  itemBundle: string
  additional?: string
  clipboardId: string
}

export interface DraggableNativeDropItem {
  itemType: 'native_drop'
  element: () => HTMLElement
  itemBundles: string[]
  dataTransfer: DataTransfer | null
  clipboardItems?: BlokkliClipboardItem[]
  /**
   * Eagerly extracted from DataTransfer in resolveBundles, because the
   * DataTransfer object becomes stale after the synchronous event handler
   * returns (e.g. while the bundle selector is shown).
   */
  files?: File[]
}

declare module '#blokkli/editor/adapter' {
  interface BlokkliAdapter<T> {
    /**
     * Determine the block bundle for the given clipboard item.
     */
    clipboardMapBundle?(
      e: ClipboardMapBundleEvent,
    ): string | string[] | undefined | null

    /**
     * Add a clipboard item.
     */
    addBlockFromClipboardItem?(
      e: AddClipboardItemEvent,
    ): Promise<MutationResponseLike<T>> | undefined

    /**
     * Paste existing blocks.
     */
    pasteExistingBlocks?(
      e: PasteExistingBlocksEvent,
    ): Promise<MutationResponseLike<T>>
  }
}

declare module '#blokkli/editor/types/draggable' {
  interface DraggableItemTypes {
    clipboard: DraggableClipboardItem
    native_drop: DraggableNativeDropItem
  }
}
