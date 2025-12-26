<template>
  <div class="bk bk-diff-sidebar-pane">
    <DiffViewerState
      v-if="stateBefore"
      :state-before
      :state-after
      scheme="orange"
    />
  </div>
</template>

<script setup lang="ts">
import { useBlokkli, useAsyncData } from '#imports'
import { DiffViewerState } from '#blokkli/editor/components'

const { adapter, state } = useBlokkli()

const { data: stateBefore } = await useAsyncData('stateBefore', () => {
  return adapter.loadStateAtIndex!(-1).then((v: any) => adapter.mapState(v))
})

const stateAfter = state.getMappedState()
</script>
