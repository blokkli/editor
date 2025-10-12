<template>
  <Overlay v-if="isVisible && gl && animation.webglEnabled.value" :gl="gl" />
</template>

<script lang="ts" setup>
import Overlay from './Overlay/index.vue'
import { computed, useBlokkli, defineBlokkliFeature } from '#imports'

defineBlokkliFeature({
  id: 'hover',
  icon: 'selection',
  label: 'Hover',
  description:
    'Renders a border around blocks that are currently being hovered.',
})

const { selection, ui, animation, dom } = useBlokkli()

const gl = animation.gl()

const isVisible = computed(
  () =>
    dom.isReady.value &&
    !selection.isMultiSelecting.value &&
    !selection.editableActive.value &&
    !selection.isDragging.value &&
    !ui.isAnimating.value,
)
</script>

<script lang="ts">
export default {
  name: 'Hover',
}
</script>
