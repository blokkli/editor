<template>
  <div
    ref="list"
    @pointerdown.capture.prevent="onPointerDown"
    @pointerup.capture.prevent="onPointerUp"
    @pointermove.capture.prevent="onPointerMove"
  >
    <slot></slot>
  </div>
</template>

<script lang="ts" setup>
import type { Coord, DraggableItem } from '#blokkli/types'
import { useBlokkli, ref, type ComponentPublicInstance } from '#imports'
import {
  buildDraggableItem,
  getDistance,
  getInteractionCoordinates,
} from '#blokkli/helpers'

defineProps<{}>()

const { selection, eventBus } = useBlokkli()

let pointerStartCoords: Coord | null = null
let activeItem: DraggableItem | null = null
let pointerStartTimestamp = 0

function onPointerDown(e: PointerEvent) {
  if (!(e.target instanceof HTMLElement || e.target instanceof SVGElement)) {
    return
  }
  pointerStartCoords = getInteractionCoordinates(e)
  pointerStartTimestamp = Date.now()

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
  if (!pointerStartCoords || !activeItem) {
    return
  }

  const coords = getInteractionCoordinates(e)
  const distance = getDistance(coords, pointerStartCoords)

  if (distance > 7) {
    eventBus.emit('dragging:start', {
      items: [activeItem],
      coords,
      mode: 'mouse',
    })
    activeItem = null
    pointerStartCoords = null
  }
}

function onPointerUp(e: PointerEvent) {
  pointerStartCoords = null
}
</script>

<script lang="ts">
export default {
  name: 'Sortli',
}
</script>
