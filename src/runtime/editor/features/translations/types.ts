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

declare module '#blokkli/editor/events' {
  interface EventbusEvents {
    translateEntity: EntityTranslation
    'entity:translated': string
    batchTranslate: undefined
  }
}
