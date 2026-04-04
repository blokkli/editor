import type { EntityTranslation } from '#blokkli/editor/types/state'
import type { TextFieldValue } from '#blokkli/editor/providers/fieldValue'
import type { GenericAdapterResponse } from '#blokkli/editor/adapter'

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

    /**
     * Load all text field values for a given language.
     *
     * Used by the CSV export to fetch source language values when the editor
     * is viewing a translation.
     */
    loadTextFieldValuesForLanguage?: (
      langcode: string,
    ) => Promise<TextFieldValue[]>

    /**
     * Import translations for multiple languages at once.
     *
     * Each item includes the target language, block UUID, field name, and
     * the new field value. Applied as a single mutation so it can be undone
     * in one step.
     */
    importTranslationsBatched?: (
      items: {
        langcode: string
        uuid: string
        fieldName: string
        fieldValue: string
      }[],
    ) => Promise<MutationResponseLike<T>>

    /**
     * Request automatic translations for a batch of text fields.
     *
     * Each item includes a key (uuid:fieldName), the source text, and the
     * source/target language codes. Returns the translated texts keyed by
     * the same key. This is a pure query with no side effects - applying
     * the results uses importTranslationsBatched.
     */
    requestTranslation?: (
      items: {
        key: string
        text: string
        sourceLanguage: string
        targetLanguage: string
      }[],
    ) => Promise<
      GenericAdapterResponse<{ key: string; translatedText: string }[]>
    >
  }
}

declare module '#blokkli/editor/events' {
  interface EventbusEvents {
    translateEntity: EntityTranslation
    'entity:translated': string
    batchTranslate: undefined
  }
}
