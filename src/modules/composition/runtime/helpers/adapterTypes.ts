import type { AddNewBlocksEventBlock } from '#blokkli/editor/events'

/**
 * A composition's whole state: its source and every child it places. A child
 * it has gets the given values and options, a new one is created, and one the
 * list leaves out is removed.
 */
export type UpdateCompositionEvent = {
  /** The composition paragraph. */
  uuid: string
  /** The option that holds the document, and its new value. */
  optionKey: string
  value: string
  /** The field of the children. */
  fieldName: string
  children: AddNewBlocksEventBlock[]
}

// MutationResponseLike is the adapter module's own: in scope here.
declare module '#blokkli/editor/adapter' {
  interface BlokkliAdapter<T> {
    /**
     * Sets a composition's source and its children in one mutation.
     */
    updateComposition?: (
      e: UpdateCompositionEvent,
    ) => Promise<MutationResponseLike<T>>
  }
}
