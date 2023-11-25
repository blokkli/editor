<template>
  <PluginParagraphAction
    title="Duplizieren"
    @click="onClick"
    :disabled="editMode !== 'editing'"
    meta
    key-code="D"
    multiple
    icon="duplicate"
  />
</template>

<script lang="ts" setup>
import { DraggableExistingParagraphItem } from '#pb/types'
import { PluginParagraphAction } from '#pb/plugins'

const { editMode, adapter, mutateWithLoadingState } =
  useParagraphsBuilderStore()

function onClick(items: DraggableExistingParagraphItem[]) {
  mutateWithLoadingState(
    adapter.duplicateParagraphs(items.map((v) => v.uuid)),
    'Der Abschnitt konnte nicht dupliziert werden.',
  )
}
</script>
