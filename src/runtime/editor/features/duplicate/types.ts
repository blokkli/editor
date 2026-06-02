declare module '#blokkli/editor/adapter' {
  interface BlokkliAdapter<T> {
    /**
     * Duplicate blocks.
     */
    duplicateBlocks?: (uuids: string[]) => Promise<MutationResponseLike<T>>
  }
}

export {}
