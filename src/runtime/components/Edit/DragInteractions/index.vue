<template>
  <Teleport to="body">
    <div
      class="bk-interaction-overlay"
      :style="overlayStyle"
      @pointerdown="onPointerDown"
      @pointerup="onPointerUp"
      @pointermove="onPointerMove"
    >
      <!-- <svg -->
      <!--   v-if="dom.isReady.value" -->
      <!--   v-bind="svgAttributes" -->
      <!--   ref="svg" -->
      <!--   class="bk-drag-interactions-svg" -->
      <!-- > -->
      <!--   <rect -->
      <!--     v-for="rect in rects" -->
      <!--     :key="rect.uuid" -->
      <!--     :x="rect.rect.x" -->
      <!--     :y="rect.rect.y" -->
      <!--     :width="rect.rect.width" -->
      <!--     :height="rect.rect.height" -->
      <!--   /> -->
      <!-- </svg> -->
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { falsy, getDistance, getInteractionCoordinates } from '#blokkli/helpers'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import type { Coord, Rectangle } from '#blokkli/types'
import { watch, ref, useBlokkli, computed } from '#imports'

const { dom, eventBus, selection, keyboard, ui } = useBlokkli()

const svg = ref<SVGElement | null>(null)

const cursor = computed(() => {
  if (selection.isMultiSelecting.value) {
    return 'crosshair'
  } else if (keyboard.isPressingSpace.value) {
    return 'move'
  }

  return 'default'
})

const overlayStyle = computed(() => {
  return {
    top: ui.visibleViewport.value.y + 'px',
    left: ui.visibleViewport.value.x + 'px',
    width: ui.visibleViewport.value.width + 'px',
    height: ui.visibleViewport.value.height + 'px',
    cursor: cursor.value,
  }
})

const svgAttributes = computed(() => {
  const width = ui.artboardSize.value.width
  const height = ui.artboardSize.value.height
  return {
    width,
    height,
    viewBox: `0 0 ${width} ${height}`,
  }
})

const rects = ref<{ uuid: string; rect: Rectangle }[]>([])

function buildRects() {
  const visible = dom.getVisibleBlocks()
  rects.value = visible
    .map((uuid) => {
      const rect = dom.getBlockRect(uuid)
      if (!rect) {
        return
      }
      return { uuid, rect }
    })
    .filter(falsy)
}

watch(dom.isReady, buildRects)

type InteractedElement = {
  uuid?: string
  editableFieldName?: string
  timestamp: number
  x: number
  y: number
}

let lastInteractedElement: InteractedElement | null = null
let pointerDownElement: InteractedElement | null = null
let mouseStartCoordinates: Coord | null = null

function getInteractedElement(
  e: MouseEvent | TouchEvent,
): InteractedElement | null {
  const { x, y } = getInteractionCoordinates(e)
  const elements = document.elementsFromPoint(x, y)

  let editableFieldName = ''
  let uuid = ''

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i]
    if (!(el instanceof HTMLElement)) {
      continue
    }
    if (el.dataset.blokkliEditableField) {
      editableFieldName = el.dataset.blokkliEditableField
    }
    if (!el.dataset.uuid) {
      continue
    }
    const block = dom.findBlock(el.dataset.uuid)
    if (!block) {
      continue
    }
    const draggableEl = block.dragElement()
    if (el !== draggableEl && !elements.includes(draggableEl)) {
      continue
    }
    uuid = el.dataset.uuid
    break
  }

  if (editableFieldName || uuid) {
    return { editableFieldName, uuid, timestamp: Date.now(), x, y }
  }

  return null
}

function onPointerMove(e: PointerEvent) {
  if (keyboard.isPressingSpace.value) {
    return
  }
  if (e.pointerType === 'touch') {
    return onTouchMove(e)
  }
  if (e.buttons !== 1) {
    return
  }
  if (
    !pointerDownElement ||
    !mouseStartCoordinates ||
    selection.isDragging.value ||
    keyboard.isPressingSpace.value ||
    selection.isMultiSelecting.value
  ) {
    return
  }

  const diffX = Math.abs(mouseStartCoordinates.x - e.clientX)
  const diffY = Math.abs(mouseStartCoordinates.y - e.clientY)
  // Only start dragging if at least 6px in any direction were moved.
  if (diffX < 6 && diffY < 6) {
    return
  }

  const interacted = getInteractedElement(e)
  if (interacted && interacted.uuid) {
    // The interacted block is part of the current selection.
    if (selection.uuids.value.includes(interacted.uuid)) {
      eventBus.emit('dragging:start', {
        items: [...selection.blocks.value],
        coords: { x: e.clientX, y: e.clientY },
        mode: 'mouse',
      })
    } else {
      const block = dom.findBlock(interacted.uuid)
      if (block) {
        eventBus.emit('dragging:start', {
          items: [block],
          coords: { x: e.clientX, y: e.clientY },
          mode: 'mouse',
        })
      }
    }
  }
}

let pointerDownTimestamp = 0

function onPointerDown(e: PointerEvent) {
  if (e.pointerType === 'touch') {
    return onTouchStart(e)
  }
  pointerDownTimestamp = Date.now()
  const coords = { x: e.clientX, y: e.clientY }
  mouseStartCoordinates = coords
  const interacted = getInteractedElement(e)
  pointerDownElement = interacted
  if (interacted) {
    return
  }
  eventBus.emit('mouse:down', { ...coords, type: 'mouse', distance: 0 })
}

function onPointerUp(e: PointerEvent) {
  // This is required because emitting the mouse:up event would set this value to false.
  const wasDragging = selection.isDragging.value
  const wasMultiSelecting = selection.isMultiSelecting.value
  pointerDownElement = null

  if (e.pointerType === 'touch') {
    return onTouchEnd(e)
  }
  const coords = getInteractionCoordinates(e)
  const distance = mouseStartCoordinates
    ? getDistance(mouseStartCoordinates, coords)
    : 0
  eventBus.emit('mouse:up', {
    x: e.clientX,
    y: e.clientY,
    type: 'mouse',
    distance,
    duration: Date.now() - pointerDownTimestamp,
  })

  // Prevents selecting the block under the current pointer position when dragging or multi selecting is ending.
  if (wasDragging || wasMultiSelecting) {
    return
  }
  if (keyboard.isPressingSpace.value) {
    return
  }
  if (selection.editableActive.value) {
    eventBus.emit('editable:save')
    lastInteractedElement = null
    return
  }
  const clicked = getInteractedElement(e)

  // Handle double clicking.
  if (
    clicked?.uuid &&
    lastInteractedElement &&
    clicked.uuid === lastInteractedElement.uuid
  ) {
    const deltaTime = Date.now() - pointerDownTimestamp
    const deltaX = Math.abs(lastInteractedElement.x - e.clientX)
    const deltaY = Math.abs(lastInteractedElement.y - e.clientY)
    if (deltaTime < 400 && deltaX < 3 && deltaY < 3) {
      if (clicked.editableFieldName) {
        eventBus.emit('editable:focus', {
          fieldName: clicked.editableFieldName,
          uuid: clicked.uuid,
        })
        return
      }
      if (lastInteractedElement.uuid) {
        const block = dom.findBlock(lastInteractedElement.uuid)
        if (!block) {
          return
        }
        eventBus.emit('item:edit', {
          uuid: lastInteractedElement.uuid,
          bundle: block.itemBundle,
        })
      }
    }
  }
  lastInteractedElement = clicked
  if (clicked?.uuid) {
    if (keyboard.isPressingControl.value || selection.isMultiSelecting.value) {
      // Toggle the clicked block.
      eventBus.emit('select:toggle', clicked.uuid)
    } else if (keyboard.isPressingShift.value) {
      eventBus.emit('select:shiftToggle', clicked.uuid)
    } else {
      eventBus.emit('select', clicked.uuid)
    }
    return
  }
  eventBus.emit('window:clickAway')
}

let longPressTimeout: any = null

let touchStartInteraction: InteractedElement | null = null
let touchStartCoords: Coord | null = null
let longPressInteraction: InteractedElement | null = null

let touchStartTimestamp = 0

function onTouchStart(e: PointerEvent) {
  if (e.isPrimary) {
    touchStartTimestamp = Date.now()
  }
  longPressInteraction = null
  const coords = getInteractionCoordinates(e)
  touchStartCoords = coords
  eventBus.emit('mouse:down', { ...coords, type: 'touch', distance: 0 })
  if (selection.isDragging.value) {
    return
  }
  clearTimeout(longPressTimeout)

  const interacted = getInteractedElement(e)
  if (!interacted?.uuid) {
    return
  }

  touchStartInteraction = interacted

  longPressTimeout = setTimeout(() => {
    // Block is already selected. Start dragging.
    if (touchStartInteraction?.uuid) {
      longPressInteraction = touchStartInteraction
      if (selection.uuids.value.includes(touchStartInteraction.uuid)) {
        eventBus.emit('dragging:start', {
          items: [...selection.blocks.value],
          coords: {
            x: touchStartInteraction.x,
            y: touchStartInteraction.y,
          },
          mode: 'touch',
        })
        return
      }

      // Start multiselecting.
      eventBus.emit('select:start', {
        uuids: [...selection.uuids.value, touchStartInteraction.uuid],
        mode: 'touch',
      })
    }
  }, 500)
}

function onTouchMove(e: PointerEvent) {
  if (!longPressTimeout || !touchStartInteraction) {
    return
  }
  const coords = getInteractionCoordinates(e)

  const deltaX = Math.abs(coords.x - touchStartInteraction.x)
  const deltaY = Math.abs(coords.y - touchStartInteraction.y)

  if (deltaX > 10 || deltaY > 10) {
    clearTimeout(longPressTimeout)
    longPressTimeout = null
  }
}

function onTouchEnd(e: PointerEvent) {
  const wasDragging = selection.isDragging.value
  const coords = getInteractionCoordinates(e)
  const distance = touchStartCoords ? getDistance(touchStartCoords, coords) : 0
  if (e.isPrimary) {
    eventBus.emit('mouse:up', {
      ...coords,
      type: 'touch',
      distance,
      duration: Date.now() - touchStartTimestamp,
    })
  }
  clearTimeout(longPressTimeout)
  longPressTimeout = null
  if (wasDragging) {
    return
  }
  if (!touchStartCoords) {
    return
  }

  // If the distance is abve this value, don't do anything. The user is likely scrolling.
  if (distance > 7) {
    return
  }
  const interacted = getInteractedElement(e)
  if (interacted?.uuid) {
    // Prevent unselecting the block after a long press interaction, which has already selected the block.
    if (longPressInteraction && longPressInteraction.uuid === interacted.uuid) {
      return
    }
    if (selection.isMultiSelecting.value) {
      eventBus.emit('select:toggle', interacted.uuid)
    } else {
      eventBus.emit('select', interacted.uuid)
    }
  } else {
    eventBus.emit('window:clickAway')
  }
  longPressInteraction = null
}

let lastRectUpdate: number = Date.now()

onBlokkliEvent('canvas:draw', (e) => {
  // if (!svg.value) {
  //   return
  // }
  // svg.value.style.transform = `translate3d(${e.artboardOffset.x}px, ${e.artboardOffset.y}px, 0) scale(${e.artboardScale})`
  // if (
  //   Date.now() - lastRectUpdate > 1000 &&
  //   !selection.isDragging.value &&
  //   !selection.isMultiSelecting.value &&
  //   !keyboard.isPressingSpace.value &&
  //   !keyboard.isPressingControl.value
  // ) {
  //   buildRects()
  //   lastRectUpdate = Date.now()
  // }
})
</script>
