import type { BlokkliItemHost } from '#blokkli/editor/types/field'

export type AdapterFragmentsAddBlock = {
  name: string
  host: BlokkliItemHost
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
