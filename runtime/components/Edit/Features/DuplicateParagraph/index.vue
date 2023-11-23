<template>
  <PluginParagraphAction
    title="Duplizieren"
    @click="onClick"
    :disabled="editMode !== 'editing'"
    meta
    key-code="D"
    multiple
  >
    <Icon />
  </PluginParagraphAction>
</template>

<script lang="ts" setup>
import { DraggableExistingParagraphItem } from '../../types'
import Icon from './../../Icons/Duplicate.vue'
import PluginParagraphAction from './../../Plugin/ParagraphAction/index.vue'

const { editMode, adapter, mutateWithLoadingState } =
  useParagraphsBuilderStore()

function onClick(items: DraggableExistingParagraphItem[]) {
  mutateWithLoadingState(
    adapter.duplicateParagraphs(items.map((v) => v.uuid)),
    'Der Abschnitt konnte nicht dupliziert werden.',
  )
}
</script>
