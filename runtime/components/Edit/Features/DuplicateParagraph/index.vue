<template>
  <PluginParagraphAction
    title="Duplizieren"
    @click="onClick"
    :disabled="state.editMode.value !== 'editing'"
    meta
    key-code="D"
    multiple
    icon="duplicate"
  />
</template>

<script lang="ts" setup>
import { DraggableExistingParagraphItem } from '#pb/types'
import { PluginParagraphAction } from '#pb/plugins'

const { adapter, state } = useBlokkli()

function onClick(items: DraggableExistingParagraphItem[]) {
  state.mutateWithLoadingState(
    adapter.duplicateParagraphs(items.map((v) => v.uuid)),
    'Der Abschnitt konnte nicht dupliziert werden.',
  )
}
</script>
