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
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import { computed, useBlokkli, defineBlokkliFeature } from '#imports'
import Overlay from './Overlay/index.vue'

defineBlokkliFeature({
  id: 'selection',
  icon: 'selection',
  label: 'Selection',
  description: 'Renders an overlay that highlights the selected blocks.',
})

const { selection, state, ui, eventBus } = useBlokkli()

const isVisible = computed(
  () =>
    !selection.isChangingOptions.value &&
    !selection.isDragging.value &&
    !selection.editableActive.value &&
    !!state.refreshKey.value &&
    !ui.isAnimating.value,
)

onBlokkliEvent('keyPressed', (e) => {
  if (e.code === 'Escape') {
    eventBus.emit('select:end')
  }
})
</script>

<script lang="ts">
export default {
  name: 'Selection',
}
</script>
