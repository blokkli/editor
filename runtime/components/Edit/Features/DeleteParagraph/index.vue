<template>
  <PluginParagraphAction
    title="Löschen"
    @click="onClick"
    :disabled="state.editMode.value !== 'editing'"
    multiple
    key-code="Delete"
    icon="delete"
  />
</template>

<script lang="ts" setup>
import { DraggableExistingParagraphItem } from '#pb/types'
import { PluginParagraphAction } from '#pb/plugins'

const { state, adapter, eventBus } = useBlokkli()

async function onClick(items: DraggableExistingParagraphItem[]) {
  // Unselect all paragraphs.
  eventBus.emit('select:end', [])
  if (items.length === 1) {
    await state.mutateWithLoadingState(
      adapter.deleteParagraph(items[0].uuid),
      'Der Abschnitt konnte nicht entfernt werden.',
    )
  } else if (items.length > 1) {
    await state.mutateWithLoadingState(
      adapter.deleteMultipleParagraphs(items.map((v) => v.uuid)),
      'Die Abschnitte konnten nicht entfernt werden.',
    )
  }
}
</script>
