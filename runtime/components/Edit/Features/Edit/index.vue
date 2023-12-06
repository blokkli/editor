<template>
  <PluginItemAction
    title="Bearbeiten"
    @click="onClick"
    :disabled="disabled"
    meta
    key-code="E"
    icon="edit"
  />
</template>

<script lang="ts" setup>
import { DraggableExistingBlokkliItem } from '#blokkli/types'
import { PluginItemAction } from '#blokkli/plugins'
import { getDefinition } from '#blokkli/definitions'

const { eventBus, selection, state } = useBlokkli()

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

function onClick(paragraphs: DraggableExistingBlokkliItem[]) {
  if (paragraphs.length !== 1) {
    return
  }

  eventBus.emit('item:edit', {
    uuid: paragraphs[0].uuid,
    bundle: paragraphs[0].itemBundle,
  })
}
</script>
