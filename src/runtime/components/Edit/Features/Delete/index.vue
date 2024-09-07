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

const { state, $t, eventBus } = useBlokkli()

const { adapter } = defineBlokkliFeature({
  id: 'delete',
  icon: 'delete',
  label: 'Delete',
  requiredAdapterMethods: ['deleteBlocks'],
  description: 'Provides an action to delete one or more blocks.',
})

async function onClick(items: DraggableExistingBlock[]) {
  eventBus.emit('select', [])
  await state.mutateWithLoadingState(
    () => adapter.deleteBlocks(items.map((v) => v.uuid)),
    $t('deleteError', 'The block could not be deleted.'),
  )
}
</script>

<script lang="ts">
export default {
  name: 'Delete',
}
</script>
