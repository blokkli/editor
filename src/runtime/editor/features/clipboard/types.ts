import type { BlokkliItemHost } from '#blokkli/editor/types/field'
import type {
  UploadedMedia,
  UploadFileInfo,
  UploadType,
} from '#blokkli/editor/types/uploads'
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

/**
 * Files of one type, and the bundles a block for each of them can have.
 */
export type ClipboardFileGroup = {
  type: UploadType
  bundles: string[]
}

export type AddBlocksFromUploadsEvent = {
  /**
   * The media to add a block for, in order, each with the block's bundle.
   */
  items: (UploadedMedia & { bundle: string })[]
  host: BlokkliItemHost
  afterUuid: string | null
}

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
  /**
   * The file's size in bytes, or 0 while it's dragged: browsers only give it
   * when the file is dropped.
   */
  fileSize: number
  /**
   * The file's name, unknown while it's dragged.
   */
  fileName?: string
}

export type ClipboardMapBundleEventFile = {
  type: 'file'
  fileType: string
  /**
   * The file's size in bytes, or 0 while it's dragged: browsers only give it
   * when the file is dropped.
   */
  fileSize: number
  /**
   * The file's name, unknown while it's dragged.
   */
  fileName?: string
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

export interface DraggableNativeDropItem {
  itemType: 'native_drop'
  element: () => HTMLElement
  itemBundles: string[]
  /**
   * Bundles of which each group needs one the field allows, such as dropped
   * files of several types, each type added with its own bundle. Without
   * groups, the field needs one of the item's bundles.
   */
  itemBundleGroups?: string[][]
  /**
   * The number of blocks the item adds, one per file. Defaults to 1.
   */
  blockCount?: number
  dataTransfer: DataTransfer | null
  /**
   * What's known of the files to upload, while they're dragged: for a drag
   * from outside the browser, only their types.
   */
  uploads?: UploadFileInfo[]
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

    /**
     * Add a block for each media created from an uploaded file.
     *
     * With uploadFile, getUploadForm, createMediaFromUploads and
     * addBlocksFromUploads, pasted and dropped files are uploaded in a dialog,
     * where their media's fields are filled in. Without, each file is read and
     * added with addBlockFromClipboardItem.
     */
    addBlocksFromUploads?(
      e: AddBlocksFromUploadsEvent,
    ): Promise<MutationResponseLike<T>>
  }
}

declare module '#blokkli/editor/types/draggable' {
  interface DraggableItemTypes {
    native_drop: DraggableNativeDropItem
  }
}

export type ClipboardSelectionPayload = {
  type: 'selection'
  uuids: string[]
}

declare module '#blokkli/editor/types/clipboard' {
  interface BlokkliClipboardTypes {
    selection: ClipboardSelectionPayload
  }
}
