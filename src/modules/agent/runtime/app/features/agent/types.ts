declare module '#blokkli/editor/adapter' {
  interface BlokkliAdapter<T> {
    /**
     * Swap two blocks.
     */
    swapBlocks?: (
      first: string,
      second: string,
    ) => Promise<MutationResponseLike<T>>
  }
}
