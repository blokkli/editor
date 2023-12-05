import {
  BlokkliAvailableType,
  BlokkliAvailableFeatures,
  BlokkliComment,
  BlokkliConversionItem,
  BlokkliMappedState,
  BlokkliImportItem,
  BlokkliLibraryItem,
  BlokkliItemType,
  AddClipboardParagraphEvent,
  AddNewParagraphEvent,
  AddReusableParagraphEvent,
  ImportFromExistingEvent,
  MakeReusableEvent,
  MoveMultipleParagraphsEvent,
  MoveParagraphEvent,
  UpdateParagraphOptionEvent,
  BlokkliSearchContentItem,
  AddContentSearchItemParagraphEvent,
  BlokkliEntityTranslation,
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
   * Return a list of all paragraph types.
   */
  getAllParagraphTypes(): Promise<BlokkliItemType[]>

  /**
   * Get all available paragraph types for the current host entity.
   */
  getAvailableParagraphTypes(): Promise<BlokkliAvailableType[]>

  /**
   * Get all possible conversions.
   */
  getConversions(): Promise<BlokkliConversionItem[]>

  /*
   * Map the state returned by mutations.
   */
  mapState(state: T): BlokkliMappedState

  /**
   * Add a new paragraph.
   */
  addNewParagraph(e: AddNewParagraphEvent): Promise<MutationResponseLike<T>>

  /**
   * Update multiple paragraph options.
   */
  updateParagraphOptions(
    options: UpdateParagraphOptionEvent[],
  ): Promise<MutationResponseLike<T>>

  /**
   * Add a clipboard paragraph.
   */
  addClipboardParagraph?: (
    e: AddClipboardParagraphEvent,
  ) => Promise<MutationResponseLike<T>> | undefined

  /**
   * Move a paragraph.
   */
  moveParagraph(e: MoveParagraphEvent): Promise<MutationResponseLike<T>>

  /**
   * Move multiple paragraphs.
   */
  moveMultipleParagraphs(
    e: MoveMultipleParagraphsEvent,
  ): Promise<MutationResponseLike<T>>

  /**
   * Add a reusable paragraph.
   */
  addReusableParagraph(
    e: AddReusableParagraphEvent,
  ): Promise<MutationResponseLike<T>>

  /**
   * Delete a paragraph.
   */
  deleteParagraph(uuid: string): Promise<MutationResponseLike<T>>

  /**
   * Delete multiple paragraphs.
   */
  deleteMultipleParagraphs(uuids: string[]): Promise<MutationResponseLike<T>>

  /**
   * Convert multiple paragraphs.
   */
  convertParagraphs(
    uuids: string[],
    targetBundle: string,
  ): Promise<MutationResponseLike<T>>

  /**
   * Duplicate multiple paragraphs.
   */
  duplicateParagraphs(uuids: string[]): Promise<MutationResponseLike<T>>

  /**
   * Get all existing entities for importing.
   */
  getImportItems(
    searchText?: string,
  ): Promise<{ items: BlokkliImportItem[]; total: number }>

  /**
   * Import paragraphs from an existing entity.
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
   * Add a comment to a paragraph.
   */
  addComment(paragraphUuids: string[], body: string): Promise<BlokkliComment[]>

  /**
   * Resolve a comment.
   */
  resolveComment(uuid: string): Promise<BlokkliComment[]>

  /**
   * Make a paragraph reusable.
   */
  makeParagraphReusable(e: MakeReusableEvent): Promise<MutationResponseLike<T>>

  /**
   * Get all paragraph library items.
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
   * Add the dropped paragraph from a search content item.
   */
  addContentSearchItemParagraph?: (
    e: AddContentSearchItemParagraphEvent,
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
