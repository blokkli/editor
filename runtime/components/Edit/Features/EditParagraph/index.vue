<template>
  <PluginParagraphAction
    title="Bearbeiten"
    @click="onClick"
    :disabled="disabled"
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
import { definitions } from '#nuxt-paragraphs-builder/definitions'

const { editMode, eventBus, selectedParagraphs } = useParagraphsBuilderStore()

const disabled = computed(() => {
  if (editMode.value !== 'editing') {
    return true
  }
  if (selectedParagraphs.value.length > 1) {
    return true
  }

  const type = selectedParagraphs.value[0]?.paragraphType
  return definitions.find((v) => v.bundle === type)?.disableEdit === true
})

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
