import type { DraggableHostData } from '#blokkli/types'

export type AddContentSearchItemEvent = {
  item: SearchContentItem
  host: DraggableHostData
  bundle: string
  afterUuid: string | null
}

export interface DraggableSearchContentItem {
  itemType: 'search_content'
  element: () => HTMLElement
  itemBundles: string[]
  searchItem: SearchContentItem
}

/**
 * Defines a content search item.
 */
export type SearchContentItem = {
  /**
   * The ID of the item.
   */
  id: string

  /**
   * The entity type of the item.
   */
  entityType: string

  /**
   * The entity bundle of the item.
   */
  entityBundle: string

  /**
   * The title displayed to the user.
   */
  title: string

  /**
   * The possible bundles for which a block may be added using this content item.
   */
  targetBundles: string[]

  /**
   * Additional context displayed alongside the title.
   */
  context?: string

  /**
   * The text displayed to the user.
   */
  text?: string

  /**
   * An optional image URL that is used instead of an icon.
   */
  imageUrl?: string
}

declare module '#blokkli/editor/adapter' {
  interface BlokkliAdapter<T> {
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
  }
}
