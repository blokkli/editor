<template>
  <Teleport :to="ui.mainLayoutElement.value">
    <div class="bk absolute pointer-events-none invisible">
      <div ref="dragPreviewRef" class="bk-block-transfer-drag-preview">
        <Icon name="bk_mdi_upload" />
        <span>
          {{
            $t('blockTransferDragLabel', '@count blocks').replace(
              '@count',
              String(pendingDrag?.count ?? 0),
            )
          }}
        </span>
      </div>
    </div>
    <BlokkliTransition name="slide-up">
      <SummaryDialog v-if="summary" :summary @close="summary = null" />
    </BlokkliTransition>
  </Teleport>
</template>

<script lang="ts" setup>
import {
  defineAsyncComponent,
  defineBlokkliFeature,
  ref,
  useBlokkli,
  useTemplateRef,
} from '#imports'
import { BlokkliTransition, Icon } from '#blokkli/editor/components'
import {
  defineDropHandler,
  defineItemDropdownAction,
  onBlokkliEvent,
} from '#blokkli/editor/composables'
import { emitMessage, eventBus } from '#blokkli/editor/events'
import type { BlokkliItemHost } from '#blokkli/editor/types/field'
import type {
  BlockTransferImportSummary,
  DraggableBlockTransferItem,
} from './types'

const SummaryDialog = defineAsyncComponent(
  () => import('./SummaryDialog/index.vue'),
)

const { adapter } = defineBlokkliFeature({
  id: 'block-transfer',
  label: 'Block Transfer',
  icon: 'bk_mdi_upload',
  description:
    'Export selected blocks to a portable clipboard envelope and paste them back in any blökkli editor.',
})

const { $t, state, ui, selection, animation, types, context, permissions } =
  useBlokkli()

const summary = ref<BlockTransferImportSummary | null>(null)
const pendingDrag = ref<{ count: number } | null>(null)
const dragPreviewRef = useTemplateRef<HTMLElement>('dragPreviewRef')

async function onClickExport() {
  if (!adapter.exportBlocksToTransferable) {
    return
  }

  const uuids = selection.uuids.value
  if (!uuids.length) {
    return
  }

  let envelope: Awaited<
    ReturnType<NonNullable<typeof adapter.exportBlocksToTransferable>>
  > = null
  try {
    envelope = await adapter.exportBlocksToTransferable({ uuids })
  } catch (_e) {
    envelope = null
  }

  if (!envelope) {
    emitMessage(
      $t('blockTransferExportError', 'Could not export the selected blocks.'),
      'error',
    )
    return
  }

  try {
    await ui.setClipboardData({
      type: 'block_transfer',
      bundles: envelope.bundles,
      transferable: envelope.transferable,
    })
  } catch (_e) {
    emitMessage(
      $t(
        'blockTransferClipboardError',
        'Failed to write to the clipboard. Please check your browser permissions.',
      ),
      'error',
    )
    return
  }

  emitMessage(
    $t('blockTransferExportSuccess', 'Blocks exported to clipboard.'),
    'success',
  )
}

defineItemDropdownAction(() => {
  if (
    !adapter.exportBlocksToTransferable ||
    !permissions.hasPermission('transfer_blocks') ||
    !selection.items.value.length ||
    state.editMode.value !== 'editing'
  ) {
    return
  }

  return {
    id: 'block-transfer-export',
    label: $t('blockTransferExport', 'Export to clipboard'),
    description: $t(
      'blockTransferExportDescription',
      'Copy the selected blocks to the clipboard so you can paste them into another field, page or blökkli editor.',
    ),
    icon: 'bk_mdi_upload',
    group: 'clipboard',
    weight: 110,
    callback: onClickExport,
  }
})

function summaryHasWarnings(s: BlockTransferImportSummary): boolean {
  return (
    s.skippedBundles.length > 0 ||
    s.droppedFields.length > 0 ||
    s.referencesResolvedByLabel.length > 0 ||
    s.referencesUnresolved.length > 0
  )
}

async function runImport(
  transferable: string,
  host: BlokkliItemHost,
  afterUuid?: string,
) {
  await state.mutateWithLoadingState(
    async () => {
      const result = await adapter.importBlocksFromTransferable!({
        transferable,
        host,
        afterUuid,
      })
      if (result.success && result.importSummary) {
        if (summaryHasWarnings(result.importSummary)) {
          summary.value = result.importSummary
        } else {
          emitMessage(
            $t('blockTransferImportSuccess', '@count blocks imported.').replace(
              '@count',
              String(result.importSummary.paragraphsImported),
            ),
            'success',
          )
        }
      }
      return result
    },
    $t('blockTransferImportError', 'Could not import the blocks.'),
  )
}

onBlokkliEvent('clipboard:paste', ({ data }) => {
  if (data.type !== 'block_transfer') return
  if (!Array.isArray(data.bundles) || typeof data.transferable !== 'string') {
    return
  }
  const bundles = data.bundles.filter((b): b is string => typeof b === 'string')
  const { transferable } = data

  if (
    !adapter.importBlocksFromTransferable ||
    !permissions.hasPermission('transfer_blocks')
  ) {
    emitMessage(
      $t(
        'blockTransferImportUnsupported',
        'Importing exported blocks is not supported by this editor.',
      ),
      'warning',
    )
    return
  }

  if (
    ui.hasDialogOpen.value ||
    ui.hasNestedEditorOpen.value ||
    state.editMode.value !== 'editing'
  ) {
    return
  }

  // Look up block fields directly on the host entity type/bundle —
  // not via mutatedFields, which is empty on a brand-new page. When
  // the host has exactly one block field there's only one place the
  // import could possibly go, so skip the drag and paste straight in.
  const hostFields = types.fieldConfig.forEntityTypeAndBundle(
    context.value.entityType,
    context.value.entityBundle,
  )

  if (!hostFields.length) {
    emitMessage(
      $t('blockTransferPasteNoTarget', 'No place to paste imported content.'),
      'warning',
    )
    return
  }

  if (hostFields.length === 1) {
    const field = hostFields[0]!
    runImport(transferable, {
      type: context.value.entityType,
      uuid: context.value.entityUuid,
      fieldName: field.name,
    })
    return
  }

  // Multiple candidate fields — start a drag interaction so the user
  // can pick where the imported blocks should land.
  if (!dragPreviewRef.value) {
    return
  }

  const el = dragPreviewRef.value
  pendingDrag.value = { count: bundles.length }

  const item: DraggableBlockTransferItem = {
    itemType: 'block_transfer',
    transferable,
    itemBundles: bundles,
    element: () => el,
  }

  eventBus.emit('dragging:start', {
    items: [item],
    coords: animation.getMouseCoords(),
    mode: 'mouse',
  })
})

onBlokkliEvent('dragging:end', () => {
  pendingDrag.value = null
})

defineDropHandler('block_transfer', {
  execute: async ({ items, host, afterUuid }) => {
    const item = items[0]
    if (!item || !adapter.importBlocksFromTransferable) {
      return
    }
    await runImport(item.transferable, host, afterUuid ?? undefined)
  },
})
</script>

<script lang="ts">
export default {
  name: 'BlockTransfer',
}
</script>

<style lang="postcss">
.bk-block-transfer-drag-preview {
  @apply flex items-center gap-10 px-15 py-10 bg-accent-700 text-white rounded shadow-md font-bold;

  svg {
    @apply size-24 fill-current;
  }
}
</style>
