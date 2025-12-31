import type { EntityTranslation } from '#blokkli/editor/types/state'

declare module '#blokkli/editor/adapter' {
  interface BlokkliAdapter<T> {
    /**
     * Change the language.
     */
    changeLanguage?: (translation: EntityTranslation) => Promise<any>
  }
}
