export type HostEntitySearchResultLabelMap = {
  label: string
  bundles: Record<string, string>
}

export type HostEntitySearchResultItem = {
  /**
   * The ID of the host entity.
   */
  id: string

  /**
   * The UUID of the host entity.
   */
  uuid: string

  /**
   * The entity type of the host entity.
   */
  entityType: string

  /**
   * The entity bundle of the host entity.
   */
  bundle: string

  /**
   * The label of the host entity.
   */
  label: string

  /**
   * The url to start editing.
   */
  url: string

  /**
   * If an edit state exists: The time when the edit state was last changed.
   */
  lastChanged: string | null

  /**
   * If an edit state exists: The ID of the owner of the edit state.
   */
  uid: string | null

  /**
   * Optional additional context used for searching (e.g. SKU, internal ID).
   *
   * Not displayed in the UI, but included in the fzf search.
   */
  context?: string
}

export type HostEntitySearchResult = {
  items: HostEntitySearchResultItem[]

  /**
   * A map with keys that are entity types.
   */
  labelMap: HostEntitySearchResultLabelMap
}

declare module '#blokkli/editor/adapter' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface BlokkliAdapter<T> {
    /**
     * Search for host entities.
     */
    getHostEntities?: () => Promise<HostEntitySearchResult>
  }
}
