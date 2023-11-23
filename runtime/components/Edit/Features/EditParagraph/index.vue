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
import { DraggableExistingParagraphItem } from '../../types'
import Icon from './../../Icons/Edit.vue'
import PluginParagraphAction from './../../Plugin/ParagraphAction/index.vue'

const { editMode, eventBus } = useParagraphsBuilderStore()

function onClick(paragraphs: DraggableExistingParagraphItem[]) {
  if (paragraphs.length !== 1) {
    return
  }

  eventBus.emit('editParagraph', {
    uuid: paragraphs[0].uuid,
    bundle: paragraphs[0].paragraphType,
  })
}
</script>
