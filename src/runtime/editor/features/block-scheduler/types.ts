export type BlokkliAdapterSetBlockScheduleOptions = {
  /**
   * The UUID of the block.
   */
  uuid: string

  /**
   * The schedule type.
   */
  type: 'publish' | 'unpublish'

  /**
   * The date. If empty, remove the schedule date.
   */
  date?: string
}

export type BlokkliAdapterUnscheduleBlockOptions = {
  uuid: string
}

declare module '#blokkli/editor/adapter' {
  interface BlokkliAdapter<T> {
    /**
     * Schedule a block.
     */
    setBlockScheduleDate?: (
      blocks: BlokkliAdapterSetBlockScheduleOptions[],
    ) => Promise<MutationResponseLike<T | undefined | null>>
  }
}
