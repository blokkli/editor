import type { ComputedRef } from 'vue'
import type {
  CommentItem,
  ConversionItem,
  MappedState,
  ImportItem,
  LibraryItem,
  BlockBundleDefinition,
  EntityTranslation,
  SearchContentItem,
  AddClipboardItemEvent,
  AddNewBlockEvent,
  AddReusableItemEvent,
  ImportFromExistingEvent,
  MakeReusableEvent,
  MoveMultipleBlocksEvent,
  MoveBlockEvent,
  UpdateBlockOptionEvent,
  AddContentSearchItemEvent,
  TransformPlugin,
  EditBlockEvent,
  PasteExistingBlocksEvent,
  UpdateFieldValueEvent,
  AssistantResult,
  DraggableHostData,
  DetachReusableBlockEvent,
  FieldConfig,
  EditableFieldConfig,
  DraggableMediaLibraryItem,
  DroppableFieldConfig,
} from './../types'
import type getVideoId from 'get-video-id'

import type { GetMediaLibraryFunction } from './../components/Edit/Features/MediaLibrary/types'

export type { GetMediaLibraryFunction }

export interface MutationResponseLike<T> {
  success: boolean
  state: T
  errors?: string[]
}

type AdapterApplyTransformPlugin = {
  pluginId: string
  uuids: string[]
}

export type UpdateEntityFieldValueEvent = {
  fieldName: string
  fieldValue: string
}

export type AdapterFragmentsAddBlock = {
  name: string
  host: DraggableHostData
  preceedingUuid?: string
}

export type MediaLibraryAddBlockEvent = {
  host: DraggableHostData
  preceedingUuid?: string
  item: DraggableMediaLibraryItem
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

type AdapterAssistantAddBlockFromResult = {
  result: AssistantResult
  host: DraggableHostData
  preceedingUuid?: string
}

type AdapterAssistantGetResultsCreate = {
  type: 'create'
  prompt: string
}

type AdapterAssistantGetResultsEdit = {
  type: 'edit'
  /**
   * The text that should be edited.
   */
  text: string
  prompt: string
}

type AdapterAssistantGetResults =
  | AdapterAssistantGetResultsCreate
  | AdapterAssistantGetResultsEdit

type AdapterBuildEditableFrameUrl = {
  fieldName: string
  uuid?: string
}

type AdapterFormFrameBuilderResult = {
  url: string
}

type AdapterFormFrameBuilderBlockAdd = {
  id: 'block:add'
  data: AddNewBlockEvent
}

type AdapterFormFrameBuilderBlockTranslate = {
  id: 'block:translate'
  data: EditBlockEvent
  langcode: string
}

type AdapterFormFrameBuilderBlockEdit = {
  id: 'block:edit'
  data: EditBlockEvent
}

type AdapterFormFrameBuilderEntityEdit = {
  id: 'entity:edit'
}

type AdapterFormFrameBuilderEntityTranslate = {
  id: 'entity:translate'
  translation: EntityTranslation
}

type AdapterFormFrameBuilderBatchTranslate = {
  id: 'batchTranslate'
}

export type AdapterFormFrameBuilder =
  | AdapterFormFrameBuilderBlockAdd
  | AdapterFormFrameBuilderBlockEdit
  | AdapterFormFrameBuilderBlockTranslate
  | AdapterFormFrameBuilderEntityEdit
  | AdapterFormFrameBuilderEntityTranslate
  | AdapterFormFrameBuilderBatchTranslate

export interface AdapterContext {
  entityType: string
  entityUuid: string
  entityBundle: string
  language: string
}

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

export type BlokkliAdapterGetLibraryItemsData = {
  bundles: string[]
  page: number
  text: string
}

export type BlokkliAdapterGetLibraryItemsResult = {
  items: LibraryItem[]
  total: number
  perPage: number
}

export type BlokkliAdapterPublishOptions = {
  /**
   * Whether the editor will be closed after publishing.
   *
   * If false, the adapter should return an empty state again, so that the
   * editor UI shows the correct state (no pending changes).
   * If true, the adapter may return no state at all, since the editor will
   * be closed anyway after publishing.
   */
  closeAfterPublish?: boolean
}

export interface BlokkliAdapter<T> {
  /**
   * Load the state for the given langcode.
   */
  loadState(langcode?: string | undefined | null): Promise<T | undefined>

  /*
   * Map the state returned by mutations.
   */
  mapState(state: T): MappedState

  /**
   * Get disabled features at runtime.
   *
   * For example, the "Translation" feature can be disabled if the current
   * entity does not support translations.
   *
   * For features that are always disabled, use the `alterFeatures` option of
   * the module to remove them entirely.
   */
  getDisabledFeatures?: () => Promise<string[]>

  /**
   * Return a list of all types.
   */
  getAllBundles(): Promise<BlockBundleDefinition[]>

  /**
   * Get the field configurations.
   */
  getFieldConfig(): Promise<FieldConfig[]>

  /**
   * Get the editable field configurations.
   */
  getEditableFieldConfig?: () => Promise<EditableFieldConfig[]>

  /**
   * Get the droppable field configurations.
   */
  getDroppableFieldConfig?: () => Promise<DroppableFieldConfig[]>

  /**
   * Get all possible conversions.
   */
  getConversions?: () => Promise<ConversionItem[]>

  /**
   * Convert multiple items.
   */
  convertBlocks?: (
    uuids: string[],
    targetBundle: string,
  ) => Promise<MutationResponseLike<T>>

  /**
   * Get all possible transform plugins.
   */
  getTransformPlugins?: () => Promise<TransformPlugin[]>

  /**
   * Apply a transform plugin.
   */
  applyTransformPlugin?: (
    e: AdapterApplyTransformPlugin,
  ) => Promise<MutationResponseLike<T>>

  /**
   * Add a new block.
   */
  addNewBlock(e: AddNewBlockEvent): Promise<MutationResponseLike<T>>

  /**
   * Update multiple options.
   */
  updateOptions?: (
    options: UpdateBlockOptionEvent[],
  ) => Promise<MutationResponseLike<T>>

  /**
   * Determine the block bundle for the given clipboard item.
   */
  clipboardMapBundle?: (e: ClipboardMapBundleEvent) => string | undefined

  /**
   * Add a clipboard item.
   */
  addBlockFromClipboardItem?: (
    e: AddClipboardItemEvent,
  ) => Promise<MutationResponseLike<T>> | undefined

  /**
   * Move an item.
   */
  moveBlock(e: MoveBlockEvent): Promise<MutationResponseLike<T>>

  /**
   * Move multiple items.
   */
  moveMultipleBlocks(
    e: MoveMultipleBlocksEvent,
  ): Promise<MutationResponseLike<T>>

  /**
   * Add a reusable item.
   */
  addLibraryItem?: (e: AddReusableItemEvent) => Promise<MutationResponseLike<T>>

  /**
   * Build the URL to edit a library item.
   */
  getLibraryItemEditUrl?: (uuid: string) => string

  /**
   * Delete multiple items.
   */
  deleteBlocks?: (uuids: string[]) => Promise<MutationResponseLike<T>>

  /**
   * Duplicate blocks.
   */
  duplicateBlocks?: (uuids: string[]) => Promise<MutationResponseLike<T>>

  /**
   * Paste existing blocks.
   */
  pasteExistingBlocks?: (
    e: PasteExistingBlocksEvent,
  ) => Promise<MutationResponseLike<T>>

  /**
   * Get all existing entities for importing.
   */
  getImportItems?: (
    searchText?: string,
  ) => Promise<{ items: ImportItem[]; total: number }>

  /**
   * Import items from an existing entity.
   */
  importFromExisting?: (
    e: ImportFromExistingEvent,
  ) => Promise<MutationResponseLike<T>>

  /**
   * Revert all changes to the last published state.
   */
  revertAllChanges?: () => Promise<MutationResponseLike<T>>

  /**
   * Publish all changes.
   */
  publish?: (
    options: BlokkliAdapterPublishOptions,
  ) => Promise<MutationResponseLike<T | undefined | null>>

  /**
   * Set a specific history index.
   */
  setHistoryIndex?: (index: number) => Promise<MutationResponseLike<T>>

  /**
   * Set the status of a mutation item.
   */
  setMutationItemStatus?: (
    index: number,
    status: boolean,
  ) => Promise<MutationResponseLike<T>>

  /**
   * Take ownership of the edit state.
   */
  takeOwnership?: () => Promise<MutationResponseLike<T>>

  /**
   * Load all comments.
   */
  loadComments?: () => Promise<CommentItem[]>

  /**
   * Add a comment to one or more items.
   */
  addComment?: (blockUuids: string[], body: string) => Promise<CommentItem[]>

  /**
   * Resolve a comment.
   */
  resolveComment?: (uuid: string) => Promise<CommentItem[]>

  /**
   * Make an item reusable.
   */
  makeBlockReusable?: (e: MakeReusableEvent) => Promise<MutationResponseLike<T>>

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
   * Get the last changed timestamp for the edit state.
   */
  getLastChanged?: () => Promise<number>

  /**
   * Get the shareable preview URL.
   *
   * This should return a URL that can be used to bypass logins, using a token or similar, that can be shared with non-editing people.
   */
  getPreviewGrantUrl?: () =>
    | Promise<string | undefined | null>
    | string
    | undefined
    | null

  /**
   * Return the possible content search tabs.
   */
  getContentSearchTabs?: () =>
    | Record<string, string>
    | Promise<Record<string, string>>

  /**
   * Return items for the "content" search.
   *
   * Should only return a limited amount of results, sorted by relevance.
   */
  getContentSearchResults?: (
    tab: string,
    text: string,
  ) => Promise<SearchContentItem[]>

  /**
   * Add the dropped item from a search content item.
   */
  addContentSearchItem?: (
    e: AddContentSearchItemEvent,
  ) => Promise<MutationResponseLike<T>> | undefined

  /**
   * Change the language.
   */
  changeLanguage?: (translation: EntityTranslation) => Promise<any>

  /**
   * Build the URL for forms.
   */
  formFrameBuilder?: (
    e: AdapterFormFrameBuilder,
  ) => AdapterFormFrameBuilderResult | undefined

  /**
   * Update the value of a single block field.
   */
  updateFieldValue?: (
    e: UpdateFieldValueEvent,
  ) => Promise<MutationResponseLike<T>> | undefined

  /**
   * Update the value of a single entity field.
   */
  updateEntityFieldValue?: (
    e: UpdateEntityFieldValueEvent,
  ) => Promise<MutationResponseLike<T>> | undefined

  /**
   * Build the iframe URL for an editable of type "frame".
   */
  buildEditableFrameUrl?: (
    e: AdapterBuildEditableFrameUrl,
  ) => string | undefined

  /**
   * Get the result for an assistant query.
   */
  assistantGetResults?: (
    e: AdapterAssistantGetResults,
  ) => Promise<AssistantResult | undefined>

  /**
   * Add one or more blocks from the given assistant result.
   */
  assistantAddBlockFromResult?: (
    e: AdapterAssistantAddBlockFromResult,
  ) => Promise<MutationResponseLike<T>> | undefined

  /**
   * Return the HTML markup for displaying the grid.
   */
  getGridMarkup?: () => Promise<string> | string

  /**
   * Return the media library results and filters using the given selected filter.
   */
  mediaLibraryGetResults?: GetMediaLibraryFunction<any>

  /**
   * Create a new block from the given media library item.
   */
  mediaLibraryAddBlock?: (
    e: MediaLibraryAddBlockEvent,
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

  /**
   * Add a fragment block.
   */
  fragmentsAddBlock?: (
    e: AdapterFragmentsAddBlock,
  ) => Promise<MutationResponseLike<T>> | undefined
}

export type BlokkliAdapterFactory<T> = (
  ctx: ComputedRef<AdapterContext>,
) => Promise<BlokkliAdapter<T>> | BlokkliAdapter<T>

export type AdapterMethods = keyof BlokkliAdapter<any>

export function defineBlokkliEditAdapter<T>(
  cb: BlokkliAdapterFactory<T>,
): BlokkliAdapterFactory<T> {
  return cb
}
