import type { AddClipboardItemEvent } from '#blokkli/editor/events'
import type { DraggableHostData } from '#blokkli/types'
import type getVideoId from 'get-video-id'

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
  host: DraggableHostData
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

export type ClipboardMapBundleEvent =
  | ClipboardMapBundleEventVideo
  | ClipboardMapBundleEventImage
  | ClipboardMapBundleEventFile
  | ClipboardMapBundleEventPlaintext

export interface DraggableClipboardItem {
  itemType: 'clipboard'
  element: () => HTMLElement
  itemBundle: string
  additional?: string
  clipboardId: string
}

declare module '#blokkli/editor/adapter' {
  interface BlokkliAdapter<T> {
    /**
     * Determine the block bundle for the given clipboard item.
     */
    clipboardMapBundle?(e: ClipboardMapBundleEvent): string | undefined | null

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
  }
}
