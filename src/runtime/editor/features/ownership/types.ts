declare module '#blokkli/editor/adapter' {
  interface BlokkliAdapter<T> {
    /**
     * Take ownership of the edit state.
     */
    takeOwnership?: () => Promise<MutationResponseLike<T>>
  }
}
