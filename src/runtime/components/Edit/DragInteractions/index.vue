<template>
  <div />
</template>

<script setup lang="ts">
import {
  falsy,
  getDistance,
  getInteractionCoordinates,
  isInsideRect,
} from '#blokkli/helpers'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import type { Coord, Rectangle } from '#blokkli/types'
import { watch, ref, useBlokkli, onMounted, onBeforeUnmount } from '#imports'

const { dom, eventBus, selection, keyboard, ui, state } = useBlokkli()

const rootEl = ui.rootElement()

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
    let el: Element = elements[i]

    if (!(el instanceof HTMLElement)) {
      continue
    }

    if (el.dataset.blokkliEditableField) {
      editableFieldName = el.dataset.blokkliEditableField
    }

    // elementsFromPoint() does not contain the <tr> element if the deepest element is a <td> or <th>.
    // In this case, we have to use direct parent element which is always going to be <tr>.
    // This fixes the scenario where the root element of a block is a <tr>.
    if (el instanceof HTMLTableCellElement) {
      const parent = el.parentElement
      if (parent instanceof HTMLTableRowElement) {
        el = parent
      }
    }

    if (!(el instanceof HTMLElement)) {
      continue
    }

    if (!el.dataset.uuid) {
      continue
    }
    const block = dom.findBlock(el.dataset.uuid)
    if (!block) {
      continue
    }
    const draggableEl = dom.getDragElement(block)
    if (draggableEl && el !== draggableEl && !elements.includes(draggableEl)) {
      continue
    }
    uuid = el.dataset.uuid
    break
  }

  if (editableFieldName || uuid) {
    return { editableFieldName, uuid, timestamp: Date.now(), x, y }
  }

  // Try to find a block to select by matching its rects.
  // Some blocks might not render anything and thus have a height of 0.
  // All registered block rects enfore a minimum height. That way we might
  // still be able to select a block.
  const visibleUuids = dom.getVisibleBlocks()
  for (let i = 0; i < visibleUuids.length; i++) {
    const rect = dom.getBlockRect(visibleUuids[i])
    if (rect) {
      const relativeRect = ui.getViewportRelativeRect(rect)
      if (isInsideRect(x, y, relativeRect)) {
        return {
          uuid: visibleUuids[i],
          timestamp: Date.now(),
          x,
          y,
        }
      }
    }
  }

  return null
}

function onPointerMove(e: PointerEvent) {
  if (keyboard.isPressingSpace.value || state.editMode.value !== 'editing') {
    return
  }
  e.preventDefault()
  e.stopPropagation()
  e.stopImmediatePropagation()
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
let pointerUpTimestamp = 0

function onPointerDown(e: PointerEvent) {
  if (!keyboard.isPressingSpace.value) {
    e.preventDefault()
    e.stopPropagation()
    e.stopImmediatePropagation()
  }

  rootEl.removeEventListener('pointermove', onPointerMove)
  rootEl.addEventListener('pointermove', onPointerMove)

  if (e.pointerType === 'touch') {
    return onTouchStart(e)
  }

  // If we are already dragging, return.
  // This might be the case if a dragging:start event was manually triggered,
  // e.g. when selecting a draggable item using the keyboard.
  if (selection.isDragging.value) {
    return
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
  rootEl.removeEventListener('pointermove', onPointerMove)
  e.preventDefault()
  e.stopPropagation()
  e.stopImmediatePropagation()
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
    eventBus.emit('dragging:end')
    return
  }
  if (keyboard.isPressingSpace.value) {
    return
  }
  if (selection.editableActive.value) {
    eventBus.emit('window:clickAway')
    lastInteractedElement = null
    return
  }
  const clicked = getInteractedElement(e)

  // Handle double clicking.
  if (
    clicked &&
    pointerUpTimestamp &&
    lastInteractedElement &&
    (clicked.uuid === lastInteractedElement.uuid ||
      clicked.editableFieldName === lastInteractedElement.editableFieldName)
  ) {
    const deltaTime = Date.now() - pointerUpTimestamp
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
        eventBus.emit('item:doubleClick', block)
      }
    }
  }
  lastInteractedElement = clicked
  pointerUpTimestamp = Date.now()
  if (clicked?.uuid) {
    dom.refreshBlockRect(clicked.uuid)
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
      if (
        selection.uuids.value.includes(touchStartInteraction.uuid) &&
        state.editMode.value === 'editing'
      ) {
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

onBlokkliEvent('dragging:start', (e) => {
  mouseStartCoordinates = e.coords
})

function onClick(e: MouseEvent) {
  e.preventDefault()
  e.stopImmediatePropagation()
  e.stopPropagation()
}

onMounted(() => {
  const providerElement = ui.providerElement()

  providerElement.addEventListener('click', onClick, {
    capture: true,
  })

  rootEl.addEventListener('click', onClick, {
    capture: true,
  })

  rootEl.addEventListener('pointerdown', onPointerDown, {
    capture: true,
  })

  rootEl.addEventListener('pointerup', onPointerUp, {
    capture: true,
  })
})

onBeforeUnmount(() => {
  const providerElement = ui.providerElement()

  providerElement.removeEventListener('click', onClick, {
    capture: true,
  })

  rootEl.removeEventListener('click', onClick, {
    capture: true,
  })

  rootEl.removeEventListener('pointerdown', onPointerDown, {
    capture: true,
  })
  rootEl.removeEventListener('pointermove', onPointerMove)

  rootEl.removeEventListener('pointerup', onPointerUp, {
    capture: true,
  })
})
</script>
