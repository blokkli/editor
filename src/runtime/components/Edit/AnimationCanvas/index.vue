<template>
  <Teleport to="#bk-canvas-overlay">
    <canvas
      id="bk-animation-canvas-webgl"
      ref="canvasEl"
      :style
      @click.capture="onClick"
      @pointerdown.capture="onPointerDown"
      @pointerup.capture="onPointerUp"
    />
  </Teleport>
</template>

<script lang="ts" setup>
import {
  falsy,
  getDistance,
  getInteractionCoordinates,
  isInsideRect,
} from '#blokkli/helpers'
import { MOUSE_BUTTON, MOUSE_BUTTONS } from '#blokkli/helpers/dom'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import type { Rectangle, Coord } from '#blokkli/types'
import {
  ref,
  computed,
  useBlokkli,
  onMounted,
  watch,
  useTemplateRef,
  onBeforeUnmount,
} from '#imports'

const {
  dom,
  eventBus,
  selection,
  keyboard,
  ui,
  animation,
  state,
  editable,
  runtimeConfig,
} = useBlokkli()

const style = computed<Record<string, string>>(() => {
  return {
    imageRendering: 'pixelated',
    cursor: animation.cursor.value,
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
let pointerDownTimestamp = 0
let pointerUpTimestamp = 0

function getInteractedElement(
  e: MouseEvent | TouchEvent,
): InteractedElement | null {
  const { x, y } = getInteractionCoordinates(e)
  const editableField = editable.getEditableAtPoint(x, y)
  if (editableField) {
    const uuid =
      editableField.type === runtimeConfig.itemEntityType
        ? editableField.uuid
        : undefined
    return {
      editableFieldName: editableField.fieldName,
      uuid,
      timestamp: Date.now(),
      x,
      y,
    }
  }

  // Try to find a block to select by matching its rects.
  // Some blocks might not render anything and thus have a height of 0.
  // All registered block rects enfore a minimum height.
  const visibleUuids = dom.getVisibleBlocks()

  let deepestUuid = ''
  let deepestLevel = -1

  for (let i = 0; i < visibleUuids.length; i++) {
    const uuid = visibleUuids[i]
    if (!uuid) {
      continue
    }
    const rect = dom.getBlockRect(uuid)
    if (rect) {
      const level = state.getNestingLevel(uuid)
      if (level <= deepestLevel) {
        continue
      }
      const relativeRect = ui.getViewportRelativeRect(rect)
      if (isInsideRect(x, y, relativeRect)) {
        deepestUuid = uuid
        deepestLevel = level
      }
    }
  }

  if (deepestUuid) {
    return {
      uuid: deepestUuid,
      timestamp: Date.now(),
      x,
      y,
    }
  }

  return null
}

function onPointerMove(e: PointerEvent) {
  if (keyboard.isPressingSpace.value || e.buttons === MOUSE_BUTTONS.AUXILIARY) {
    return
  }
  e.preventDefault()
  e.stopPropagation()
  e.stopImmediatePropagation()
  if (e.pointerType === 'touch') {
    return onTouchMove(e)
  }
  if (e.buttons !== MOUSE_BUTTONS.PRIMARY) {
    return
  }
  if (
    !mouseStartCoordinates ||
    selection.isMultiSelecting.value ||
    selection.isDragging.value ||
    keyboard.isPressingSpace.value
  ) {
    return
  }

  const diffX = Math.abs(mouseStartCoordinates.x - e.clientX)
  const diffY = Math.abs(mouseStartCoordinates.y - e.clientY)

  if (!pointerDownElement) {
    const timeDelta = Date.now() - pointerDownTimestamp
    const maxMovement = Math.max(diffX, diffY)

    // Start multiselecting if:
    // - mouse moves more than 6 pixels in any direction in more than 150ms
    // - mouse moves more than 20 pixels with no min. duration
    if ((maxMovement > 6 && timeDelta > 150) || maxMovement > 20) {
      canvasEl.value?.removeEventListener('pointermove', onPointerMove)
      eventBus.emit('multi-select:start', {
        x: e.clientX,
        y: e.clientY,
      })
    }
    return
  }

  // Drag interactions only possible in edit mode.
  if (state.editMode.value !== 'editing') {
    return
  }

  // Only start dragging if at least 6px in both direction were moved.
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
    canvasEl.value?.removeEventListener('pointermove', onPointerMove)
  }
}

function onPointerDown(e: PointerEvent) {
  if (e.buttons === MOUSE_BUTTONS.AUXILIARY) {
    return
  }

  if (!keyboard.isPressingSpace.value) {
    e.preventDefault()
    e.stopPropagation()
    e.stopImmediatePropagation()
  }
  // Set the state of the pressed shortcuts.
  keyboard.setShortcutStateFromEvent(e)

  canvasEl.value?.removeEventListener('pointermove', onPointerMove)
  if (state.isLoading.value) {
    return
  }
  canvasEl.value?.addEventListener('pointermove', onPointerMove)

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

  // Only handle click interactions when:
  // - not pressing the shift key
  // - using the left mouse button
  if (!e.shiftKey && e.buttons === MOUSE_BUTTONS.PRIMARY) {
    const interacted = getInteractedElement(e)
    pointerDownElement = interacted
    if (interacted) {
      return
    }
  }

  // Either pressing shift or right mouse button.
  // Features may handle this via event (e.g. start multi select).
  eventBus.emit('mouse:down', { ...coords, type: 'mouse', distance: 0 })
}

function isClickInArtboard(coords: Coord): boolean {
  const size = ui.artboardSize.value
  const scale = ui.artboardScale.value
  const rect: Rectangle = {
    x: ui.artboardOffset.value.x,
    y: ui.artboardOffset.value.y,
    width: size.width * scale,
    height: size.height * scale,
  }
  return isInsideRect(coords.x, coords.y, rect)
}

function onPointerUp(e: PointerEvent) {
  canvasEl.value?.removeEventListener('pointermove', onPointerMove)
  if (e.button === MOUSE_BUTTON.AUXILIARY) {
    e.preventDefault()
    return
  }
  e.preventDefault()
  e.stopPropagation()
  e.stopImmediatePropagation()
  // This is required because emitting the mouse:up event would set this value to false.
  const wasDragging = selection.isDragging.value
  const wasMultiSelecting = selection.isMultiSelecting.value
  pointerDownElement = null

  if (state.isLoading.value) {
    return
  }

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

  // Let renderers handle the click first (e.g. add buttons)
  if (animation.handleClick(e.clientX, e.clientY)) {
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

  if (isClickInArtboard(coords)) {
    eventBus.emit('select:host')
  } else {
    eventBus.emit('select:host:unselect')
  }
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

  // Let renderers handle the click first (e.g. add buttons)
  if (animation.handleClick(coords.x, coords.y)) {
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

const canvasEl = useTemplateRef('canvasEl')

const canvasAttributes = computed(() => {
  return {
    width: ui.viewport.value.width * animation.dpi.value,
    height: ui.viewport.value.height * animation.dpi.value,
  }
})

let gl: WebGLRenderingContext | null | undefined = null

function initGl() {
  if (!canvasEl.value) {
    return
  }
  gl = animation.gl()

  canvasEl.value.width = canvasAttributes.value.width
  canvasEl.value.height = canvasAttributes.value.height

  if (!gl) {
    return
  }

  gl.enable(gl.BLEND)
  gl.enable(gl.SCISSOR_TEST)
  gl.disable(gl.DEPTH_TEST)

  gl.clearColor(0.0, 0.0, 0.0, 0.0)
  gl.viewport(0, 0, canvasAttributes.value.width, canvasAttributes.value.height)
  // gl.blendFunc(gl[source.value as any], gl[destination.value as any])
  // gl.blendEquation(gl[equtation.value as any])
  gl.blendFunc(gl.SRC_ALPHA_SATURATE, gl.ONE)
  gl.blendEquation(gl.FUNC_ADD)
  setScissor(scissor.value)
}

const scissor = computed(() => {
  const dpi = animation.dpi.value
  return {
    x: ui.visibleViewport.value.x * dpi,
    y:
      canvasAttributes.value.height -
      ui.visibleViewport.value.y * dpi -
      ui.visibleViewport.value.height * dpi,
    width: Math.max(ui.visibleViewport.value.width * dpi, 1),
    height: Math.max(ui.visibleViewport.value.height * dpi, 1),
  }
})

function setScissor(v: Rectangle) {
  if (!gl) {
    return
  }

  gl.scissor(v.x, v.y, v.width, v.height)
}

watch(scissor, setScissor)

let lastCanvasWidth = 0
let lastCanvasHeight = 0

onBlokkliEvent('animationFrame', () => {
  if (!canvasEl.value) {
    return
  }
  const canvasWidth = canvasAttributes.value.width
  const canvasHeight = canvasAttributes.value.height

  // Only update width and height if they have changed.
  if (canvasWidth !== lastCanvasWidth || canvasHeight !== lastCanvasHeight) {
    canvasEl.value.width = canvasWidth
    canvasEl.value.height = canvasHeight
    if (gl) {
      gl.viewport(0, 0, canvasWidth, canvasHeight)
    }
    lastCanvasWidth = canvasWidth
    lastCanvasHeight = canvasHeight
  }
})

onMounted(() => {
  initGl()
})

onBeforeUnmount(() => {
  if (canvasEl.value) {
    canvasEl.value.removeEventListener('pointermove', onPointerMove)
  }
})
</script>
