import type { BlokkliAdapterSearchResults } from '#blokkli/editor/adapter'

export type BlokkliAdapterGetImportItemsResult =
  BlokkliAdapterSearchResults<ImportItem>

export type ImportFromExistingEvent = {
  sourceUuid: string
  sourceFields: string[]
}

export interface ImportItem {
  uuid: string
  label: string
  description?: string
}

declare module '#blokkli/editor/adapter' {
  interface BlokkliAdapter<T> {
    /**
     * Get all existing entities for importing.
     */
    getImportItems?: (
      e: AdapterSearchArguments,
    ) => Promise<BlokkliAdapterGetImportItemsResult>

    /**
     * Import items from an existing entity.
     */
    importFromExisting?: (
      e: ImportFromExistingEvent,
    ) => Promise<MutationResponseLike<T>>
  }
}
