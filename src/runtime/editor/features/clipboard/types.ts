import type { BlokkliItemHost } from '#blokkli/editor/types/field'
import type { PluginConfigInput } from '#blokkli/editor/types/pluginConfig'
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
 * How a file is uploaded and added: as an image or as a file.
 */
export type ClipboardUploadType = 'image' | 'file'

/**
 * Files of one type, and the bundles a block for each of them can have.
 */
export type ClipboardFileGroup = {
  type: ClipboardUploadType
  bundles: string[]
}

export type UploadFileEvent = {
  file: File
  type: ClipboardUploadType
  /**
   * Called with the share of the file uploaded, from 0 to 1.
   */
  onProgress: (progress: number) => void
  /**
   * Aborts the upload.
   */
  signal: AbortSignal
}

/**
 * An uploaded file, from which a media is created. Or, if a media with the same
 * file exists, that media, which is added as it is.
 */
export type UploadFileResult =
  | { fileId: string }
  | { media: { id: string; label: string } }

/**
 * A file uploaded to create a media from.
 */
export type ClipboardUpload = {
  type: ClipboardUploadType
  fileId: string
}

/**
 * The form of the media created from an uploaded file.
 */
export type ClipboardUploadForm = {
  /**
   * The form's fields.
   */
  inputs: PluginConfigInput[]
  /**
   * Whether the fields are all the form needs: if not, a required field can't
   * be filled in, and no media can be created.
   */
  complete: boolean
}

export type CreateMediaFromUploadsItem = {
  upload: ClipboardUpload
  /**
   * The values of the form's fields, keyed by their names.
   */
  values: Record<string, unknown>
}

export type CreateMediaFromUploadsResult = {
  /**
   * The ID of the media created, or null.
   */
  mediaId: string | null
  /**
   * The errors, each with the name of its field, or null.
   */
  errors: { name: string | null; message: string }[]
}

export type AddBlocksFromUploadsEvent = {
  /**
   * The media to add a block for, in order, each with the block's bundle.
   */
  items: { type: ClipboardUploadType; mediaId: string; bundle: string }[]
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
     * Upload a file to create a media from. Rejects with an error whose message
     * says why the upload failed.
     *
     * With uploadFile, getUploadForm, createMediaFromUploads and
     * addBlocksFromUploads, pasted and dropped files are uploaded in a dialog,
     * where their media's fields are filled in. Without, each file is read and
     * added with addBlockFromClipboardItem.
     */
    uploadFile?(e: UploadFileEvent): Promise<UploadFileResult>

    /**
     * Get the form of the media created from an uploaded file, or null if the
     * file is no longer available.
     */
    getUploadForm?(e: {
      upload: ClipboardUpload
    }): Promise<ClipboardUploadForm | null>

    /**
     * Create the media of uploaded files, through their forms. Returns a result
     * per item, in the same order.
     */
    createMediaFromUploads?(e: {
      items: CreateMediaFromUploadsItem[]
    }): Promise<CreateMediaFromUploadsResult[]>

    /**
     * Add a block for each media created from an uploaded file.
     */
    addBlocksFromUploads?(
      e: AddBlocksFromUploadsEvent,
    ): Promise<MutationResponseLike<T>>
  }
}

declare module '#blokkli/editor/types/draggable' {
  interface DraggableItemTypes {
    clipboard: DraggableClipboardItem
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
