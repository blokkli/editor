<template>
  <PluginItemAction
    :title="text('duplicate')"
    :disabled="state.editMode.value !== 'editing'"
    meta
    key-code="D"
    multiple
    icon="duplicate"
    :weight="-90"
    @click="onClick"
  />
</template>

<script lang="ts" setup>
import { useBlokkli } from '#imports'

import type { DraggableExistingBlokkliItem } from '#blokkli/types'
import { PluginItemAction } from '#blokkli/plugins'

const { adapter, state, text } = useBlokkli()

function onClick(items: DraggableExistingBlokkliItem[]) {
  state.mutateWithLoadingState(
    adapter.duplicateItems(items.map((v) => v.uuid)),
    text('duplicateError'),
  )
}
</script>
