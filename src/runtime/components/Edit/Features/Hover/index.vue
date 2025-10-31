<template>
  <ErrorBoundary :label="$t('feature_hover_label', 'Hover')" v-model="isLocked">
    <Overlay v-if="isVisible && gl && animation.webglEnabled.value" :gl="gl" />
  </ErrorBoundary>
</template>

<script lang="ts" setup>
import Overlay from './Overlay/index.vue'
import { computed, useBlokkli, defineBlokkliFeature, ref } from '#imports'
import { ErrorBoundary } from '#blokkli/components'

defineBlokkliFeature({
  id: 'hover',
  icon: 'selection',
  label: 'Hover',
  description:
    'Renders a border around blocks that are currently being hovered.',
})

const { selection, ui, animation, dom, $t } = useBlokkli()

const gl = animation.gl()

const isLocked = ref(false)

const isVisible = computed(
  () =>
    !isLocked.value &&
    dom.isReady.value &&
    !selection.isMultiSelecting.value &&
    !selection.editableActive.value &&
    !selection.isDragging.value &&
    !ui.hasTransformOverlayOpen.value &&
    !ui.hasDialogOpen.value &&
    !ui.isAnimating.value,
)
</script>

<script lang="ts">
export default {
  name: 'Hover',
}
</script>
