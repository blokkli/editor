declare module '#blokkli/editor/adapter' {
  interface BlokkliAdapter<T> {
    /**
     * Revert all changes to the last published state.
     */
    revertAllChanges?: () => Promise<MutationResponseLike<T>>
  }
}

export {}
