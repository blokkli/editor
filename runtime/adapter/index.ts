import type {
  BlokkliAvailableType,
  BlokkliAvailableFeatures,
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
} from '#blokkli/types'

interface MutationResponseLike<T> {
  data: {
    state?: {
      action?: {
        success?: boolean
        state?: T
      }
    }
  }
}

export interface BlokkliAdapter<T> {
  /**
   * Load the state for the given langcode.
   */
  loadState(langcode?: string | undefined | null): Promise<T | undefined>

  /**
   * Get available features at runtime.
   *
   * These will only override enabled features.
   */
  getAvailableFeatures(): Promise<BlokkliAvailableFeatures>

  /**
   * Return a list of all types.
   */
  getAllTypes(): Promise<BlokkliItemType[]>

  /**
   * Get all available blokkli types for the current entity.
   */
  getAvailableTypes(): Promise<BlokkliAvailableType[]>

  /**
   * Get all possible conversions.
   */
  getConversions(): Promise<BlokkliConversionItem[]>

  /*
   * Map the state returned by mutations.
   */
  mapState(state: T): BlokkliMappedState

  /**
   * Add a new blokkli item.
   */
  addNewBlokkliItem(e: AddNewBlokkliItemEvent): Promise<MutationResponseLike<T>>

  /**
   * Update multiple options.
   */
  updateOptions(
    options: UpdateBlokkliItemOptionEvent[],
  ): Promise<MutationResponseLike<T>>

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
  addReusableItem(e: AddReusableItemEvent): Promise<MutationResponseLike<T>>

  /**
   * Delete an item.
   */
  deleteItem(uuid: string): Promise<MutationResponseLike<T>>

  /**
   * Delete multiple items.
   */
  deleteMultipleItems(uuids: string[]): Promise<MutationResponseLike<T>>

  /**
   * Convert multiple items.
   */
  convertItems(
    uuids: string[],
    targetBundle: string,
  ): Promise<MutationResponseLike<T>>

  /**
   * Duplicate multiple items.
   */
  duplicateItems(uuids: string[]): Promise<MutationResponseLike<T>>

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
   * Get all library items.
   */
  getLibraryItems(): Promise<BlokkliLibraryItem[]>

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
}

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
