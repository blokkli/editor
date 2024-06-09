<template>
  <Overlay
    v-if="isVisible"
    :blocks="selection.blocks.value"
    :uuids="selection.uuids.value"
  />
</template>

<script lang="ts" setup>
import Overlay from './Overlay/index.vue'
import {
  calculateIntersection,
  getBounds,
  intersects,
  originatesFromTextInput,
} from '#blokkli/helpers'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import type { DraggableExistingBlock, Rectangle } from '#blokkli/types'
import { computed, useBlokkli, defineBlokkliFeature } from '#imports'

defineBlokkliFeature({
  id: 'selection',
  icon: 'selection',
  label: 'Selection',
  description: 'Renders an overlay that highlights the selected blocks.',
})

const { selection, ui, eventBus, animation, dom, tour } = useBlokkli()

const isVisible = computed(
  () =>
    dom.isReady.value &&
    !selection.isMultiSelecting.value &&
    !selection.editableActive.value &&
    !selection.isChangingOptions.value &&
    !selection.isDragging.value &&
    !ui.isAnimating.value &&
    selection.uuids.value.length,
)

/**
 * Find the block that is most visible for the user.
 *
 * Most visible is determined by how much of the block intersects with the
 * padded visible viewport area.
 */
const findMostVisibleBlock = (): string | null => {
  const viewport = ui.visibleViewportPadded.value
  const uuids = dom.getVisibleBlocks()

  let maxIntersection = 0
  let maxY = 9999
  let mostVisibleUuid: string | null = null

  for (let i = 0; i < uuids.length; i++) {
    const uuid = uuids[i]
    const absoluteRect = dom.getBlockRect(uuid)
    if (!absoluteRect) {
      continue
    }

    const rect = ui.getViewportRelativeRect(absoluteRect)

    // The intersection as a value from 0 to 1.
    const intersection = calculateIntersection(rect, viewport)
    if (intersection && intersection > maxIntersection) {
      if (rect.y < maxY && rect.y > 0) {
        mostVisibleUuid = uuid
        maxIntersection = intersection
        maxY = rect.y
      }
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

/**
 * Determine which blocks to select when the user is clicking on a block with the shift key.
 */
const visuallySelectBlocks = (toggleUuid: string): string[] | undefined => {
  const rects = dom.getBlockRects()
  const allUuids = Object.keys(rects)
  const selected = selection.uuids.value
  // Nothing selected yet, so we select the new block.
  if (selected.length === 0) {
    return [toggleUuid]
  }

  const singleSelectedBlock =
    selected.length === 1 ? dom.findBlock(selected[0]) : null

  const toggleRect = rects[toggleUuid]
  if (!toggleRect) {
    return
  }
  const toggleBlock = dom.findBlock(toggleUuid)
  if (!toggleBlock) {
    return
  }
  const filter = (encompassingRect: Rectangle): string[] => {
    const candidates: string[] = []
    for (let i = 0; i < allUuids.length; i++) {
      const uuid = allUuids[i]
      const rect = rects[uuid]
      if (!rect) {
        continue
      }

      if (!intersects(rect, encompassingRect)) {
        continue
      }

      const block = dom.findBlock(uuid)

      if (!block) {
        continue
      }

      if (
        block.isNested === toggleBlock.isNested ||
        singleSelectedBlock?.isNested === block.isNested
      ) {
        candidates.push(uuid)
      }
    }

    return candidates
  }
  const isToggleSelected = selected.includes(toggleUuid)

  // One block selected.
  if (selected.length === 1) {
    if (isToggleSelected) {
      return []
    }

    const selectedUuid = selected[0]
    const selectedRect = rects[selectedUuid]
    if (!selectedRect) {
      return
    }
    const encompassingRect = getBounds([selectedRect, toggleRect])
    if (!encompassingRect) {
      return
    }

    return filter(encompassingRect)
  }

  // More than one selected.
  // Find the most upper left element excluding the toggleElement.
  const upperLeftUuid = selected
    .filter((uuid) => (isToggleSelected ? uuid !== toggleUuid : true))
    .reduce((prev, current) => {
      const prevRect = rects[prev]
      const currentRect = rects[current]
      return currentRect &&
        prevRect &&
        prevRect.x <= currentRect.x &&
        prevRect.y <= currentRect.y
        ? prev
        : current
    })

  const upperLeftRect = rects[upperLeftUuid]
  const encompassingRect = getBounds([upperLeftRect, toggleRect])
  if (!encompassingRect) {
    return
  }

  return filter(encompassingRect)
}

onBlokkliEvent('select:shiftToggle', (uuid) => {
  const uuids = visuallySelectBlocks(uuid)
  if (uuids) {
    eventBus.emit('select', uuids)
  }
})

onBlokkliEvent('keyPressed', (e) => {
  if (selection.isDragging.value || selection.isMultiSelecting.value) {
    return
  }
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
