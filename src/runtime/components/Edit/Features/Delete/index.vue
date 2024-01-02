<template>
  <PluginItemAction
    :title="$t('deleteButton')"
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

const { state, eventBus, $t } = useBlokkli()

const adapter = defineBlokkliFeature({
  requiredAdapterMethods: ['deleteBlocks'],
  description: 'Provides an action to delete one or more blocks.',
})

async function onClick(items: DraggableExistingBlock[]) {
  // Unselect all items.
  eventBus.emit('select:end', [])
  await state.mutateWithLoadingState(
    adapter.deleteBlocks(items.map((v) => v.uuid)),
    $t('deleteError'),
  )
}
</script>

<script lang="ts">
export default {
  name: 'Delete',
}
</script>
