import type { BlokkliItemHost } from '#blokkli/editor/types/field'
import type { MutationResponseLike } from '#blokkli/editor/adapter'

export type BlockTransferImportSummary = {
  paragraphsImported: number
  skippedBundles: { bundle: string; count: number }[]
  droppedFields: { bundle: string; fieldName: string }[]
  referencesResolvedByUuid: number
  referencesResolvedByLabel: {
    entityType: string
    label: string
    targetId: string
  }[]
  referencesUnresolved: {
    entityType: string
    uuid: string | null
    label: string | null
    reason: string
  }[]
}

export type ExportBlocksToTransferableEvent = {
  uuids: string[]
}

/**
 * The structured result of a block export.
 *
 * The adapter is the single owner of the `transferable` string format —
 * the editor never inspects, parses or modifies it. The `bundles` array
 * (root-level block bundles, in order) is provided by the adapter as
 * metadata so the editor can drive the paste UX (drop-field
 * highlighting, count, listing) without peeking into the opaque
 * payload.
 */
export type BlockTransferEnvelope = {
  bundles: string[]
  transferable: string
}

export type ImportBlocksFromTransferableEvent = {
  transferable: string
  host: BlokkliItemHost
  afterUuid?: string
}

export type BlockTransferImportResponse<T> = MutationResponseLike<T> & {
  importSummary?: BlockTransferImportSummary
}

export type BlockTransferPasteEvent = {
  bundles: string[]
  transferable: string
}

export interface DraggableBlockTransferItem {
  itemType: 'block_transfer'
  transferable: string
  itemBundles: string[]
  element: () => HTMLElement
}

declare module '#blokkli/editor/types/draggable' {
  interface DraggableItemTypes {
    block_transfer: DraggableBlockTransferItem
  }
}

declare module '#blokkli/editor/adapter' {
  interface BlokkliAdapter<T> {
    /**
     * Serialize the given blocks into a portable envelope.
     *
     * Returns the root-level block bundles alongside an opaque
     * `transferable` string. The string is round-tripped verbatim into
     * `importBlocksFromTransferable` — the editor never inspects,
     * modifies or re-serializes it.
     *
     * Returns null when the backend denies the export or otherwise
     * can't produce an envelope.
     */
    exportBlocksToTransferable?(
      e: ExportBlocksToTransferableEvent,
    ): Promise<BlockTransferEnvelope | null>

    /**
     * Import blocks from a previously produced transferable string.
     *
     * Runs as a single mutation so the entire paste can be undone in one
     * step. The optional `importSummary` on the response surfaces
     * skipped bundles, dropped fields and reference-resolution details
     * for the post-paste UI.
     */
    importBlocksFromTransferable?(
      e: ImportBlocksFromTransferableEvent,
    ): Promise<BlockTransferImportResponse<T>>
  }
}

declare module '#blokkli/editor/events' {
  interface EventbusEvents {
    'blockTransfer:paste': BlockTransferPasteEvent
  }
}

declare module '#blokkli/editor/types/permissions' {
  interface UserPermissionMap {
    transfer_blocks: 'Export blocks to a portable clipboard envelope and import them in any blökkli editor.'
  }
}
