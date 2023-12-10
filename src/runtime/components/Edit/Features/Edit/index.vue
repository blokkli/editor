<template>
  <PluginItemAction
    :title="text('edit')"
    :disabled="disabled"
    meta
    key-code="E"
    icon="edit"
    :weight="-100"
    @click="onClick"
  />
</template>

<script lang="ts" setup>
import { computed, useBlokkli } from '#imports'

import type { DraggableExistingBlokkliItem } from '#blokkli/types'
import { PluginItemAction } from '#blokkli/plugins'
import { getDefinition } from '#blokkli/definitions'

const { eventBus, selection, state, text } = useBlokkli()

const disabled = computed(() => {
  if (state.editMode.value !== 'editing') {
    return true
  }
  if (selection.blocks.value.length > 1) {
    return true
  }

  const type = selection.blocks.value[0]?.itemBundle
  return !type || getDefinition(type)?.disableEdit === true
})

function onClick(items: DraggableExistingBlokkliItem[]) {
  if (items.length !== 1) {
    return
  }

  eventBus.emit('item:edit', {
    uuid: items[0].uuid,
    bundle: items[0].itemBundle,
  })
}
</script>
