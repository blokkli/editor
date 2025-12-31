export type UpdateBlockOptionEvent = {
  uuid: string
  key: string
  value: string
}

export type UpdateHostOptionEvent = {
  key: string
  value: string
}

declare module '#blokkli/editor/adapter' {
  interface BlokkliAdapter<T> {
    /**
     * Update multiple options.
     */
    updateOptions?: (
      options: UpdateBlockOptionEvent[],
    ) => Promise<MutationResponseLike<T>>

    /**
     * Update multiple host options.
     */
    updateHostOptions?: (
      options: UpdateHostOptionEvent[],
    ) => Promise<MutationResponseLike<T>>
  }
}
