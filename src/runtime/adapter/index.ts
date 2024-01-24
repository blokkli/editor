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
  publish?: () => Promise<MutationResponseLike<T>>

  /**
   * Set a specific history index.
   */
  setHistoryIndex?: (index: number) => Promise<MutationResponseLike<T>>

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
  getLibraryItems?: (bundles: string[]) => Promise<LibraryItem[]>

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
  getContentSearchTabs?: () => Record<string, string>

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
  ) => AdapterFormFrameBuilderResult | undefined | void

  /**
   * Update the value of a single block field.
   */
  updateFieldValue?: (
    e: UpdateFieldValueEvent,
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

export interface AdapterContext {
  entityType: string
  entityUuid: string
  entityBundle: string
  language: string
}

export type BlokkliAdapterFactory<T> = (
  ctx: ComputedRef<AdapterContext>,
) => BlokkliAdapter<T>

export type AdapterMethods = keyof BlokkliAdapter<any>

export function defineBlokkliEditAdapter<T>(
  cb: BlokkliAdapterFactory<T>,
): BlokkliAdapterFactory<T> {
  return cb
}
