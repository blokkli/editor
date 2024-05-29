<template>
  <PluginItemAction
    id="edit"
    :title="$t('edit', 'Edit')"
    :disabled="disabled"
    meta
    key-code="E"
    icon="edit"
    :weight="-100"
    @click="onClick"
  />
</template>

<script lang="ts" setup>
import { computed, useBlokkli, defineBlokkliFeature } from '#imports'
import type { DraggableExistingBlock } from '#blokkli/types'
import { PluginItemAction } from '#blokkli/plugins'
import { getDefinition } from '#blokkli/definitions'

defineBlokkliFeature({
  id: 'edit',
  icon: 'edit',
  label: 'Edit',
  description: 'Provides an action to edit a block.',
  requiredAdapterMethods: ['formFrameBuilder'],
})

const { eventBus, selection, state, $t } = useBlokkli()

const disabled = computed(() => {
  if (state.editMode.value !== 'editing') {
    return true
  }
  if (selection.blocks.value.length !== 1) {
    return true
  }

  const block = selection.blocks.value[0]
  const definition = getDefinition(
    block.itemBundle,
    block.hostFieldListType,
    block.parentBlockBundle,
  )
  return definition?.editor?.disableEdit === true
})

function onClick(items: DraggableExistingBlock[]) {
  if (items.length !== 1) {
    return
  }

  eventBus.emit('item:edit', {
    uuid: items[0].uuid,
    bundle: items[0].itemBundle,
  })
}
</script>

<script lang="ts">
export default {
  name: 'Edit',
}
</script>
