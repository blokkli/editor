import type { DraggableHostData } from '#blokkli/types'

export type AssistantResultMarkup = {
  type: 'markup'
  content: string
}

export type AssistantResult = AssistantResultMarkup
type AdapterAssistantAddBlockFromResult = {
  result: AssistantResult
  host: DraggableHostData
  preceedingUuid: string | null
}

type AdapterAssistantGetResultsCreate = {
  type: 'create'
  prompt: string
}

type AdapterAssistantGetResultsEdit = {
  type: 'edit'
  /**
   * The text that should be edited.
   */
  text: string
  prompt: string
}

type AdapterAssistantGetResults =
  | AdapterAssistantGetResultsCreate
  | AdapterAssistantGetResultsEdit

declare module '#blokkli/editor/adapter' {
  interface BlokkliAdapter<T> {
    /**
     * Get the result for an assistant query.
     */
    assistantGetResults?: (
      e: AdapterAssistantGetResults,
    ) => Promise<AssistantResult | undefined>

    /**
     * Add one or more blocks from the given assistant result.
     */
    assistantAddBlockFromResult?: (
      e: AdapterAssistantAddBlockFromResult,
    ) => Promise<MutationResponseLike<T>> | undefined
  }
}
