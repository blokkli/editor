<template>
  <PluginItemAction
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
import { DraggableExistingBlokkliItem } from '#blokkli/types'
import { PluginItemAction } from '#blokkli/plugins'

const { adapter, state } = useBlokkli()

function onClick(items: DraggableExistingBlokkliItem[]) {
  state.mutateWithLoadingState(
    adapter.duplicateItems(items.map((v) => v.uuid)),
    'Der Abschnitt konnte nicht dupliziert werden.',
  )
}
</script>
