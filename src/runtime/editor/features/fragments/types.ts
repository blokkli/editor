import type { DraggableHostData } from '#blokkli/types'

export type AdapterFragmentsAddBlock = {
  name: string
  host: DraggableHostData
  preceedingUuid: string | null
}

declare module '#blokkli/editor/adapter' {
  interface BlokkliAdapter<T> {
    /**
     * Add a fragment block.
     */
    fragmentsAddBlock?: (
      e: AdapterFragmentsAddBlock,
    ) => Promise<MutationResponseLike<T>> | undefined
  }
}
