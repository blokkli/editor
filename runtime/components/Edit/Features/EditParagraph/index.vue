<template>
  <PluginParagraphAction
    title="Bearbeiten"
    @click="onClick"
    :disabled="disabled"
    meta
    key-code="E"
    icon="edit"
  />
</template>

<script lang="ts" setup>
import { DraggableExistingParagraphItem } from '#pb/types'
import { PluginParagraphAction } from '#pb/plugins'
import { getDefinition } from '#nuxt-paragraphs-builder/definitions'

const { editMode, eventBus, selectedParagraphs } = useParagraphsBuilderStore()

const disabled = computed(() => {
  if (editMode.value !== 'editing') {
    return true
  }
  if (selectedParagraphs.value.length > 1) {
    return true
  }

  const type = selectedParagraphs.value[0]?.paragraphType
  return !type || getDefinition(type)?.disableEdit === true
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
