<template>
  <PluginParagraphAction
    title="Duplizieren"
    @click="onClick"
    :disabled="editMode !== 'editing'"
    meta
    key-code="D"
  >
    <Icon />
  </PluginParagraphAction>
</template>

<script lang="ts" setup>
import Icon from './../../Icons/Duplicate.vue'
import PluginParagraphAction from './../../Plugin/ParagraphAction/index.vue'

const { selectedParagraph, editMode, adapter, mutateWithLoadingState } =
  useParagraphsBuilderStore()

function onClick() {
  if (!selectedParagraph.value) {
    return
  }

  mutateWithLoadingState(
    adapter.duplicateParagraph(selectedParagraph.value.uuid),
    'Der Abschnitt konnte nicht dupliziert werden.',
  )
}
</script>
