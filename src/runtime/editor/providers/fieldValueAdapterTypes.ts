import type { TextFieldValue } from './fieldValue'

declare module '#blokkli/editor/adapter' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface BlokkliAdapter<T> {
    /**
     * Return raw text field values for all blocks.
     *
     * Used by the fieldValue provider to score unprocessed markup instead of
     * DOM-rendered content. If not implemented, the provider falls back to
     * reading text from the directive system / DOM.
     */
    getTextFieldValues?: () => Promise<TextFieldValue[]>
  }
}
