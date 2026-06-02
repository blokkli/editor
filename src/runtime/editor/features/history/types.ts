declare module '#blokkli/editor/adapter' {
  interface BlokkliAdapter<T> {
    /**
     * Set a specific history index.
     */
    setHistoryIndex?: (index: number) => Promise<MutationResponseLike<T>>

    /**
     * Set the status of a mutation item.
     */
    setMutationItemStatus?: (
      index: number,
      status: boolean,
    ) => Promise<MutationResponseLike<T>>
  }
}

export {}
