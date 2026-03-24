declare module '#blokkli/editor/adapter' {
  interface BlokkliAdapter<T> {
    /**
     * Swap the positions of two blocks.
     */
    swapBlocks?: (
      first: string,
      second: string,
    ) => Promise<MutationResponseLike<T>>
  }
}
