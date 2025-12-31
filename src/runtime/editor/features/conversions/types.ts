export interface ConversionItem {
  sourceBundle: string
  targetBundle: string
}

declare module '#blokkli/editor/adapter' {
  interface BlokkliAdapter<T> {
    /**
     * Get all possible conversions.
     */
    getConversions?: () => Promise<ConversionItem[]>

    /**
     * Convert multiple items.
     */
    convertBlocks?: (
      uuids: string[],
      targetBundle: string,
    ) => Promise<MutationResponseLike<T>>
  }
}
