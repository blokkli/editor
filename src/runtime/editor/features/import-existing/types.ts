export type ImportFromExistingEvent = {
  sourceUuid: string
  sourceFields: string[]
}

declare module '#blokkli/editor/adapter' {
  interface BlokkliAdapter<T> {
    /**
     * Import items from an existing entity.
     */
    importFromExisting?: (
      e: ImportFromExistingEvent,
    ) => Promise<MutationResponseLike<T>>
  }
}
