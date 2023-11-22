<template>
  <PluginParagraphAction
    title="Bearbeiten"
    @click="onClick"
    :disabled="editMode !== 'editing'"
    meta
    key-code="E"
  >
    <Icon />
  </PluginParagraphAction>
</template>

<script lang="ts" setup>
import Icon from './../../Icons/Edit.vue'
import PluginParagraphAction from './../../Plugin/ParagraphAction/index.vue'

const { selectedParagraph, editMode, eventBus } = useParagraphsBuilderStore()

function onClick() {
  if (!selectedParagraph.value) {
    return
  }

  eventBus.emit('editParagraph', {
    uuid: selectedParagraph.value.uuid,
    bundle: selectedParagraph.value.paragraphType,
  })
}
</script>
