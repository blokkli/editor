<template>
  <PluginParagraphAction
    title="Löschen"
    @click="onClick"
    :disabled="editMode !== 'editing'"
    key-code="DEL"
  >
    <Icon />
  </PluginParagraphAction>
</template>

<script lang="ts" setup>
import Icon from './../../Icons/Delete.vue'
import PluginParagraphAction from './../../Plugin/ParagraphAction/index.vue'

const { selectedParagraph, editMode, mutateWithLoadingState, adapter } =
  useParagraphsBuilderStore()

function onClick() {
  if (!selectedParagraph.value) {
    return
  }

  mutateWithLoadingState(
    adapter.deleteParagraph(selectedParagraph.value.uuid),
    'Der Abschnitt konnte nicht entfernt werden.',
  )
}
</script>
