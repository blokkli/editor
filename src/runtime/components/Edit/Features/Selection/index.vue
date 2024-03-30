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
import {
  calculateIntersection,
  originatesFromTextInput,
} from '#blokkli/helpers'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import type { DraggableExistingBlock } from '#blokkli/types'
import { computed, useBlokkli, defineBlokkliFeature } from '#imports'
import Overlay from './Overlay/index.vue'

defineBlokkliFeature({
  id: 'selection',
  icon: 'selection',
  label: 'Selection',
  description: 'Renders an overlay that highlights the selected blocks.',
})

const { selection, state, ui, eventBus, animation, dom, tour, runtimeConfig } =
  useBlokkli()

const isVisible = computed(
  () =>
    selection.blocks.value.length &&
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

const getSelectAllUuids = (
  allBlocks: DraggableExistingBlock[],
  currentlySelected: DraggableExistingBlock[],
): string[] => {
  // One or more blocks are selected.
  if (currentlySelected.length >= 1) {
    const selectedHostUuids = currentlySelected.map((block) => block.hostUuid)
    const selectedHostTypes = currentlySelected.map((block) => block.hostType)
    const selectedHostFieldNames = currentlySelected.map(
      (block) => block.hostFieldName,
    )
    const selectedUuids = currentlySelected.map((v) => v.uuid)

    const commonHostUuids = selectedHostUuids.filter(
      (uuid, index, self) => self.indexOf(uuid) === index,
    )
    const commonHostTypes = selectedHostTypes.filter(
      (type, index, self) => self.indexOf(type) === index,
    )
    const commonHostFieldNames = selectedHostFieldNames.filter(
      (fieldName, index, self) => self.indexOf(fieldName) === index,
    )

    // Find all blocks that share the same host.
    const newUuids = allBlocks
      .filter(
        (block) =>
          commonHostUuids.includes(block.hostUuid) &&
          commonHostTypes.includes(block.hostType) &&
          commonHostFieldNames.includes(block.hostFieldName),
      )
      .map((block) => block.uuid)

    const isSame = newUuids.every((uuid) => selectedUuids.includes(uuid))

    if (!isSame) {
      return newUuids
    }
  }

  return allBlocks
    .filter((block) => block.hostType !== 'block')
    .map((block) => block.uuid)
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
  } else if (e.code === 'a' && e.meta) {
    // Regular native CTRL+A behaviour should not be overriden.
    if (originatesFromTextInput(e.originalEvent)) {
      return
    }
    e.originalEvent.preventDefault()
    eventBus.emit(
      'select:end',
      getSelectAllUuids(dom.getAllBlocks(), selection.blocks.value),
    )
  }
})
</script>

<script lang="ts">
export default {
  name: 'Selection',
}
</script>
