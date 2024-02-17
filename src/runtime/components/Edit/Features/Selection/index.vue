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
import { calculateIntersection } from '#blokkli/helpers'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import { computed, useBlokkli, defineBlokkliFeature } from '#imports'
import Overlay from './Overlay/index.vue'

defineBlokkliFeature({
  id: 'selection',
  icon: 'selection',
  label: 'Selection',
  description: 'Renders an overlay that highlights the selected blocks.',
})

const { selection, state, ui, eventBus, animation, dom, tour } = useBlokkli()

const isVisible = computed(
  () =>
    !selection.isChangingOptions.value &&
    !selection.isDragging.value &&
    !selection.editableActive.value &&
    !!state.refreshKey.value &&
    !ui.isAnimating.value,
)

/**
 * Find the block that is most visible for the user.
 *
 * Most visible is determined by how much of the block intersects with the
 * padded visible viewport area.
 */
const findMostVisibleBlock = (): string | null => {
  const blocks = dom.getAllBlocks()

  let maxIntersection = 0
  let mostVisibleUuid: string | undefined = blocks[0]?.uuid

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]

    // Ignore nested blocks.
    if (block.isNested) {
      continue
    }

    const rect = block.element().getBoundingClientRect()

    // The intersection as a value from 0 to 1.
    const intersection = calculateIntersection(
      rect,
      ui.visibleViewportPadded.value,
    )
    if (intersection && intersection > maxIntersection) {
      mostVisibleUuid = block.uuid
      maxIntersection = intersection
    }
  }

  return mostVisibleUuid
}

onBlokkliEvent('keyPressed', (e) => {
  if (e.code === 'Escape') {
    eventBus.emit('select:end', [])
  } else if (e.code === 'Tab') {
    if (tour.isTouring.value) {
      return
    }
    e.originalEvent.preventDefault()

    // No block is selected.
    if (selection.blocks.value.length !== 1) {
      // Select the most visible block for the user.
      const uuid = findMostVisibleBlock()
      if (uuid) {
        eventBus.emit('select', uuid)
        eventBus.emit('scrollIntoView', { uuid })
      }
      return
    }

    e.shift ? eventBus.emit('select:previous') : eventBus.emit('select:next')
    animation.requestDraw()
  }
})
</script>

<script lang="ts">
export default {
  name: 'Selection',
}
</script>
