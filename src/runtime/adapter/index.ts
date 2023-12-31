import type { ComputedRef } from 'vue'
import type {
  BlokkliComment,
  BlokkliConversionItem,
  BlokkliMappedState,
  BlokkliImportItem,
  BlokkliLibraryItem,
  BlokkliItemType,
  BlokkliEntityTranslation,
  BlokkliSearchContentItem,
  AddClipboardItemEvent,
  AddNewBlokkliItemEvent,
  AddReusableItemEvent,
  ImportFromExistingEvent,
  MakeReusableEvent,
  MoveMultipleBlokkliItemsEvent,
  MoveBlokkliEvent,
  UpdateBlokkliItemOptionEvent,
  AddContentSearchItemEvent,
  BlokkliTransformPlugin,
  EditBlokkliItemEvent,
  PasteExistingBlocksEvent,
  UpdateFieldValueEvent,
  AssistantResult,
  DraggableHostData,
  DetachReusableBlockEvent,
  BlokkliFieldConfig,
} from './../types'

export interface MutationResponseLike<T> {
  data: {
    state?: {
      action?: {
        success?: boolean
        state?: T
      }
    }
  }
}

type AdapterApplyTransformPlugin = {
  pluginId: string
  uuids: string[]
}

export interface BlokkliAdapter<T> {
  /**
   * Load the state for the given langcode.
   */
  loadState(langcode?: string | undefined | null): Promise<T | undefined>

  /*
   * Map the state returned by mutations.
   */
  mapState(state: T): BlokkliMappedState

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
  getAllBundles(): Promise<BlokkliItemType[]>

  /**
   * Get the field configurations.
   */
  getFieldConfig(): Promise<BlokkliFieldConfig[]>

  /**
   * Get all possible conversions.
   */
  getConversions?: () => Promise<BlokkliConversionItem[]>

  /**
   * Get all possible transform plugins.
   */
  getTransformPlugins?: () => Promise<BlokkliTransformPlugin[]>

  /**
   * Apply a transform plugin.
   */
  applyTransformPlugin?: (
    e: AdapterApplyTransformPlugin,
  ) => Promise<MutationResponseLike<T>>

  /**
   * Add a new blokkli item.
   */
  addNewBlokkliItem(e: AddNewBlokkliItemEvent): Promise<MutationResponseLike<T>>

  /**
   * Update multiple options.
   */
  updateOptions?: (
    options: UpdateBlokkliItemOptionEvent[],
  ) => Promise<MutationResponseLike<T>>

  /**
   * Add a clipboard item.
   */
  addBlokkliItemFromClipboard?: (
    e: AddClipboardItemEvent,
  ) => Promise<MutationResponseLike<T>> | undefined

  /**
   * Move an item.
   */
  moveItem(e: MoveBlokkliEvent): Promise<MutationResponseLike<T>>

  /**
   * Move multiple items.
   */
  moveMultipleItems(
    e: MoveMultipleBlokkliItemsEvent,
  ): Promise<MutationResponseLike<T>>

  /**
   * Add a reusable item.
   */
  addLibraryItem?: (e: AddReusableItemEvent) => Promise<MutationResponseLike<T>>

  /**
   * Delete multiple items.
   */
  deleteBlocks(uuids: string[]): Promise<MutationResponseLike<T>>

  /**
   * Convert multiple items.
   */
  convertItems(
    uuids: string[],
    targetBundle: string,
  ): Promise<MutationResponseLike<T>>

  /**
   * Duplicate blocks.
   */
  duplicateBlocks?: (uuids: string[]) => Promise<MutationResponseLike<T>>

  /**
   * Paste existing blocks.
   */
  pasteExistingBlocks(
    e: PasteExistingBlocksEvent,
  ): Promise<MutationResponseLike<T>>

  /**
   * Get all existing entities for importing.
   */
  getImportItems(
    searchText?: string,
  ): Promise<{ items: BlokkliImportItem[]; total: number }>

  /**
   * Import items from an existing entity.
   */
  importFromExisting(
    e: ImportFromExistingEvent,
  ): Promise<MutationResponseLike<T>>

  /**
   * Revert all changes to the last published state.
   */
  revertAllChanges(): Promise<MutationResponseLike<T>>

  /**
   * Publish all changes.
   */
  publish(): Promise<MutationResponseLike<T>>

  /**
   * Undo the last mutation.
   */
  undo(): Promise<MutationResponseLike<T>>

  /**
   * Redo the last mutation.
   */
  redo(): Promise<MutationResponseLike<T>>

  /**
   * Set a specific history index.
   */
  setHistoryIndex(index: number): Promise<MutationResponseLike<T>>

  /**
   * Take ownership of the edit state.
   */
  takeOwnership(): Promise<MutationResponseLike<T>>

  /**
   * Load all comments.
   */
  loadComments(): Promise<BlokkliComment[]>

  /**
   * Add a comment to one or more items.
   */
  addComment(itemUuids: string[], body: string): Promise<BlokkliComment[]>

  /**
   * Resolve a comment.
   */
  resolveComment(uuid: string): Promise<BlokkliComment[]>

  /**
   * Make an item reusable.
   */
  makeItemReusable(e: MakeReusableEvent): Promise<MutationResponseLike<T>>

  /**
   * Detach a reusable block and add a copy of it in place.
   */
  detachReusableBlock?: (
    e: DetachReusableBlockEvent,
  ) => Promise<MutationResponseLike<T>>

  /**
   * Get all library items.
   */
  getLibraryItems(bundles: string[]): Promise<BlokkliLibraryItem[]>

  /**
   * Get the last changed timestamp for the edit state.
   */
  getLastChanged(): Promise<number>

  /**
   * Get the shareable preview URL.
   *
   * This should return a URL that can be used to bypass logins, using a token or similar, that can be shared with non-editing people.
   */
  getPreviewGrantUrl(): Promise<string | undefined | null>

  /**
   * Return the possible content search tabs.
   */
  getContentSearchTabs?: () => Record<string, string>

  /**
   * Return items for the "content" search.
   *
   * Should only return a limited amount of results, sorted by relevance.
   */
  getContentSearchResults?: (
    tab: string,
    text: string,
  ) => Promise<BlokkliSearchContentItem[]>

  /**
   * Add the dropped item from a search content item.
   */
  addContentSearchItem?: (
    e: AddContentSearchItemEvent,
  ) => Promise<MutationResponseLike<T>> | undefined

  /**
   * Change the language.
   */
  changeLanguage?: (translation: BlokkliEntityTranslation) => Promise<any>

  /**
   * Build the URL for forms.
   */
  formFrameBuilder?: (
    e: AdapterFormFrameBuilder,
  ) => AdapterFormFrameBuilderResult | undefined | void

  updateFieldValue: (
    e: UpdateFieldValueEvent,
  ) => Promise<MutationResponseLike<T>> | undefined

  buildEditableFrameUrl?: (
    e: AdapterBuildEditableFrameUrl,
  ) => string | undefined

  assistantGetResults?: (
    e: AdapterAssistantGetResults,
  ) => Promise<AssistantResult | undefined>

  assistantAddBlockFromResult?: (
    e: AdapterAssistantAddBlockFromResult,
  ) => Promise<MutationResponseLike<T>> | undefined
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
  data: AddNewBlokkliItemEvent
}

type AdapterFormFrameBuilderBlockTranslate = {
  id: 'block:translate'
  data: EditBlokkliItemEvent
}

type AdapterFormFrameBuilderBlockEdit = {
  id: 'block:edit'
  data: EditBlokkliItemEvent
}

type AdapterFormFrameBuilderEntityEdit = {
  id: 'entity:edit'
}

type AdapterFormFrameBuilderEntityTranslate = {
  id: 'entity:translate'
  langcode: string
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

export interface BlokkliAdapterContext {
  entityType: string
  entityUuid: string
  entityBundle: string
  language?: string
}

export type BlokkliAdapterFactory<T> = (
  ctx: ComputedRef<BlokkliAdapterContext>,
) => BlokkliAdapter<T>

export function defineBlokkliEditAdapter<T>(
  cb: BlokkliAdapterFactory<T>,
): BlokkliAdapterFactory<T> {
  return cb
}
