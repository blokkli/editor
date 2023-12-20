<template>
  <Teleport to=".bk-main-canvas">
    <Overlay v-if="isVisible" :blocks="selection.blocks.value" />
  </Teleport>
</template>

<script lang="ts" setup>
import { computed, useBlokkli } from '#imports'
import Overlay from './Overlay/index.vue'

const { selection, state } = useBlokkli()

const isVisible = computed(
  () =>
    !selection.isChangingOptions.value &&
    !selection.isDragging.value &&
    !selection.editableActive.value &&
    !!state.refreshKey.value,
)
</script>

<script lang="ts">
export default {
  name: 'Selection',
}
</script>
