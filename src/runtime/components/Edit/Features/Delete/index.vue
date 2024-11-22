<template>
  <PluginItemAction
    id="delete"
    :title="$t('deleteButton', 'Delete')"
    :disabled="state.editMode.value !== 'editing'"
    multiple
    key-code="Delete"
    icon="delete"
    :weight="-80"
    @click="onClick"
  />
</template>

<script lang="ts" setup>
import { useBlokkli, defineBlokkliFeature } from '#imports'

import type { DraggableExistingBlock } from '#blokkli/types'
import { PluginItemAction } from '#blokkli/plugins'

const { state, $t, eventBus, dom, runtimeConfig } = useBlokkli()

const { adapter } = defineBlokkliFeature({
  id: 'delete',
  icon: 'delete',
  label: 'Delete',
  requiredAdapterMethods: ['deleteBlocks'],
  description: 'Provides an action to delete one or more blocks.',
})

/**
 * Try to find a block to select after deleting a single block.
 */
function getSelectionAfterDelete(
  items: DraggableExistingBlock[],
): string | undefined {
  if (items.length !== 1) {
    return
  }

  const uuid = items[0].uuid
  const field = state.getFieldListForBlock(uuid)
  if (!field) {
    return
  }

  const index = field.list.findIndex((v) => v.uuid === uuid)
  if (index === -1) {
    return
  }

  // Find a matching block to select in the same field list.
  const inList = field.list[index + 1]?.uuid || field.list[index - 1]?.uuid
  if (inList) {
    return inList
  }

  // Field does not belong to a block.
  if (field.entityType !== runtimeConfig.itemEntityType) {
    return
  }

  // Select the block which contains the field.
  return field.entityUuid
}

async function onClick(items: DraggableExistingBlock[]) {
  const selectedUuidsAfter = getSelectionAfterDelete(items)

  await state.mutateWithLoadingState(
    () => adapter.deleteBlocks(items.map((v) => v.uuid)),
    $t('deleteError', 'The block could not be deleted.'),
  )

  if (selectedUuidsAfter) {
    eventBus.emit('select', selectedUuidsAfter)
    dom.refreshBlockRect(selectedUuidsAfter)
  } else {
    eventBus.emit('select:unselect')
  }
}
</script>

<script lang="ts">
export default {
  name: 'Delete',
}
</script>
