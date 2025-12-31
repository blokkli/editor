import type { EntityTranslation } from '#blokkli/editor/types/state'

declare module '#blokkli/editor/adapter' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface BlokkliAdapter<T> {
    /**
     * Change the language.
     */
    changeLanguage?: (translation: EntityTranslation) => Promise<any>
  }
}
