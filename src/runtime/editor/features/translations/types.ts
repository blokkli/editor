import type { EntityTranslation } from '#blokkli/editor/types/state'

declare module '#blokkli/editor/adapter' {
   
  interface BlokkliAdapter<T> {
    /**
     * Change the language.
     */
    changeLanguage?: (translation: EntityTranslation) => Promise<any>

    /**
     * Mark the translation of a block as up-to-date, removing the langcode
     * from the block's outdatedTranslations list.
     */
    markTranslationUpToDate?: (
      uuids: string[],
      langcode: string,
    ) => Promise<MutationResponseLike<T>>
  }
}

declare module '#blokkli/editor/events' {
  interface EventbusEvents {
    translateEntity: EntityTranslation
    'entity:translated': string
    batchTranslate: undefined
  }
}
