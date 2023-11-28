import {
  PbAllowedBundle,
  PbAvailableFeatures,
  PbComment,
  PbConversion,
  PbEditState,
  PbImportItem,
  PbLibraryItem,
  PbType,
  AddClipboardParagraphEvent,
  AddNewParagraphEvent,
  AddReusableParagraphEvent,
  ImportFromExistingEvent,
  MakeReusableEvent,
  MoveMultipleParagraphsEvent,
  MoveParagraphEvent,
  UpdateParagraphOptionEvent,
  PbSearchContentItem,
  AddContentSearchItemParagraphEvent,
} from '#pb/types'

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

export interface PbAdapter<T> {
  /**
   * Load the state for the given langcode.
   */
  loadState(langcode?: string | undefined | null): Promise<T | undefined>

  /**
   * Get available features at runtime.
   *
   * These will only override enabled features.
   */
  getAvailableFeatures(): Promise<PbAvailableFeatures>

  /**
   * Return a list of all paragraph types.
   */
  getAllParagraphTypes(): Promise<PbType[]>

  /**
   * Get all available paragraph types for the current host entity.
   */
  getAvailableParagraphTypes(): Promise<PbAllowedBundle[]>

  /**
   * Get all possible conversions.
   */
  getConversions(): Promise<PbConversion[]>

  /*
   * Map the state returned by mutations.
   */
  mapState(state: T): PbEditState

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
  ): Promise<{ items: PbImportItem[]; total: number }>

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
  loadComments(): Promise<PbComment[]>

  /**
   * Add a comment to a paragraph.
   */
  addComment(paragraphUuid: string, body: string): Promise<PbComment[]>

  /**
   * Resolve a comment.
   */
  resolveComment(uuid: string): Promise<PbComment[]>

  /**
   * Make a paragraph reusable.
   */
  makeParagraphReusable(e: MakeReusableEvent): Promise<MutationResponseLike<T>>

  /**
   * Get all paragraph library items.
   */
  getLibraryItems(): Promise<PbLibraryItem[]>

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
  ) => Promise<PbSearchContentItem[]>

  /**
   * Add the dropped paragraph from a search content item.
   */
  addContentSearchItemParagraph?: (
    e: AddContentSearchItemParagraphEvent,
  ) => Promise<MutationResponseLike<T>> | undefined
}

export interface PbAdapterContext {
  entityType: string
  entityUuid: string
}

export type PbAdapterFactory<T> = (ctx: PbAdapterContext) => PbAdapter<T>

export function defineBlokkliEditAdapter<T>(
  cb: PbAdapterFactory<T>,
): PbAdapterFactory<T> {
  return cb
}
