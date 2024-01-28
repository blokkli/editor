<template>
  <Teleport to=".bk-main-canvas">
    <Overlay
      v-if="isVisible"
      :key="state.refreshKey.value"
      :blocks="selection.blocks.value"
    />
  </Teleport>
</template>

<script lang="ts" setup>
import type { KeyPressedEvent } from '#blokkli/types'
import {
  computed,
  useBlokkli,
  defineBlokkliFeature,
  onMounted,
  onBeforeUnmount,
} from '#imports'
import Overlay from './Overlay/index.vue'

defineBlokkliFeature({
  id: 'selection',
  icon: 'selection',
  label: 'Selection',
  description: 'Renders an overlay that highlights the selected blocks.',
})

const { selection, state, ui, keyboard, eventBus } = useBlokkli()

const isVisible = computed(
  () =>
    !selection.isChangingOptions.value &&
    !selection.isDragging.value &&
    !selection.editableActive.value &&
    !!state.refreshKey.value &&
    !ui.isAnimating.value,
)

const onKeyPressed = (e: KeyPressedEvent) => {
  if (e.code === 'Escape') {
    eventBus.emit('select:end')
  }
}

onMounted(() => {
  eventBus.on('keyPressed', onKeyPressed)
})

onBeforeUnmount(() => {
  eventBus.off('keyPressed', onKeyPressed)
})
</script>

<script lang="ts">
export default {
  name: 'Selection',
}
</script>
