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
  await state.mutateWithLoadingState(
    adapter.deleteBlocks(items.map((v) => v.uuid)),
    text('deleteError'),
  )
}
</script>

<script lang="ts">
export default {
  name: 'Delete',
}
</script>
