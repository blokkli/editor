<template>
  <PluginParagraphAction
    title="Löschen"
    @click="onClick"
    :disabled="editMode !== 'editing'"
    multiple
    key-code="Delete"
  >
    <Icon />
  </PluginParagraphAction>
</template>

<script lang="ts" setup>
import { DraggableExistingParagraphItem } from '../../types'
import Icon from './../../Icons/Delete.vue'
import PluginParagraphAction from './../../Plugin/ParagraphAction/index.vue'

const { editMode, mutateWithLoadingState, adapter } =
  useParagraphsBuilderStore()

function onClick(items: DraggableExistingParagraphItem[]) {
  if (items.length === 1) {
    mutateWithLoadingState(
      adapter.deleteParagraph(items[0].uuid),
      'Der Abschnitt konnte nicht entfernt werden.',
    )
  } else if (items.length > 1) {
    mutateWithLoadingState(
      adapter.deleteMultipleParagraphs(items.map((v) => v.uuid)),
      'Die Abschnitte konnten nicht entfernt werden.',
    )
  }
}
</script>
