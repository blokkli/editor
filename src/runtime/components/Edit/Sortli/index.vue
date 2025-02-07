<template>
  <div
    @pointerdown.capture.prevent="onPointerDown"
    @pointerup.capture.prevent="onPointerUp"
    @pointermove.capture.prevent="onPointerMove"
  >
    <slot />
  </div>
</template>

<script lang="ts" setup>
import type { Coord, DraggableItem } from '#blokkli/types'
import { useBlokkli } from '#imports'
import {
  buildDraggableItem,
  getDistance,
  getInteractionCoordinates,
} from '#blokkli/helpers'

const { eventBus } = useBlokkli()

const props = defineProps<{
  getDragItems?: (activeItem?: DraggableItem) => DraggableItem[] | null
}>()

let pointerStartCoords: Coord | null = null
let activeItem: DraggableItem | null = null

function onPointerDown(e: PointerEvent) {
  if (!(e.target instanceof HTMLElement || e.target instanceof SVGElement)) {
    return
  }
  if (e.button !== 0) {
    pointerStartCoords = null
    return
  }
  pointerStartCoords = getInteractionCoordinates(e)

  const sortliItem = e.target.closest('[data-sortli-id]')
  if (!sortliItem) {
    return
  }

  const item = buildDraggableItem(sortliItem)

  if (!item) {
    return
  }

  activeItem = item
}

function onPointerMove(e: PointerEvent) {
  if (!pointerStartCoords || !activeItem || e.pointerType === 'touch') {
    return
  }

  const coords = getInteractionCoordinates(e)
  const distance = getDistance(coords, pointerStartCoords)

  if (distance > 7) {
    const dragItems = props.getDragItems ? props.getDragItems(activeItem) : null
    eventBus.emit('dragging:start', {
      items: dragItems && dragItems.length ? dragItems : [activeItem],
      coords,
      mode: 'mouse',
    })
    activeItem = null
    pointerStartCoords = null
  }
}

function onPointerUp(e: PointerEvent) {
  if (!pointerStartCoords || !activeItem) {
    pointerStartCoords = null
    activeItem = null
    return
  }
  const coords = getInteractionCoordinates(e)
  const distance = getDistance(coords, pointerStartCoords)
  if (e.pointerType === 'touch' && distance < 5) {
    eventBus.emit('dragging:start', {
      items: [activeItem],
      coords,
      mode: 'touch',
    })
  }

  pointerStartCoords = null
}
</script>

<script lang="ts">
export default {
  name: 'Sortli',
}
</script>
