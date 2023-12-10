<template>
  <PluginItemAction
    :title="text('deleteButton')"
    :disabled="state.editMode.value !== 'editing'"
    multiple
    key-code="Delete"
    icon="delete"
    :weight="-80"
    @click="onClick"
  />
</template>

<script lang="ts" setup>
import { useBlokkli } from '#imports'

import type { DraggableExistingBlokkliItem } from '#blokkli/types'
import { PluginItemAction } from '#blokkli/plugins'

const { state, adapter, eventBus, text } = useBlokkli()

async function onClick(items: DraggableExistingBlokkliItem[]) {
  // Unselect all items.
  eventBus.emit('select:end', [])
  if (items.length === 1) {
    await state.mutateWithLoadingState(
      adapter.deleteItem(items[0].uuid),
      text('deleteError'),
    )
  } else if (items.length > 1) {
    await state.mutateWithLoadingState(
      adapter.deleteMultipleItems(items.map((v) => v.uuid)),
      text('deleteMultipleError'),
    )
  }
}
</script>
