declare module '#blokkli/editor/adapter' {
  interface BlokkliAdapter<T> {
    /**
     * Delete multiple items.
     */
    deleteBlocks?: (uuids: string[]) => Promise<MutationResponseLike<T>>
  }
}
