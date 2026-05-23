<template>
  <Teleport to="#bk-canvas-overlay">
    <canvas
      id="bk-animation-canvas-webgl"
      :key="animation.canvasKey.value"
      ref="canvasEl"
      class="fixed top-0 left-0 size-full z-animation-canvas contain-strict"
      tabindex="0"
      :style
      @click.capture="onClick"
      @pointerdown.capture="onPointerDown"
      @pointerup.capture="onPointerUp"
      @pointermove="onPointerMove"
      @focus="onCanvasFocus"
      @blur="onCanvasBlur"
    />
  </Teleport>
</template>

<script lang="ts" setup>
import { falsy } from '#blokkli/helpers'
import { getDistance, isInsideRect } from '#blokkli/editor/helpers/geometry'
import {
  MOUSE_BUTTON,
  MOUSE_BUTTONS,
  getInteractionCoordinates,
} from '#blokkli/editor/helpers/dom'
import type { CursorKeyword } from '#blokkli/editor/types'
import {
  ref,
  computed,
  useBlokkli,
  watch,
  useTemplateRef,
  onBeforeUnmount,
} from '#imports'
import { itemEntityType } from '#blokkli-build/config'
import { onBlokkliEvent } from '#blokkli/editor/composables'
import type { Coord, Rectangle } from '#blokkli/editor/types/geometry'
import { toDraggableExisting } from '#blokkli/editor/helpers/draggable'

const {
  dom,
  eventBus,
  selection,
  keyboard,
  ui,
  animation,
  state,
  directive,
  blocks,
  fields,
  permissions,
  types,
} = useBlokkli()

function onCanvasFocus() {
  ui.setCanvasFocused(true)
}

function onCanvasBlur() {
  ui.setCanvasFocused(false)
}

let handlePointerMove = false

const cursor = computed<CursorKeyword>(() =>
  state.isLoading.value ? 'wait' : animation.cursor.value,
)

const style = computed<Record<string, string>>(() => {
  return {
    imageRendering: 'pixelated',
    cursor: cursor.value,
    pointerEvents: ui.isApproving.value ? 'none' : 'auto',
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
  droppableFieldName?: string
  droppableEntityType?: string
  droppableEntityUuid?: string
  timestamp: number
  x: number
  y: number
}

let lastInteractedElement: InteractedElement | null = null
let pointerDownElement: InteractedElement | null = null
let mouseStartCoordinates: Coord | null = null
let pointerDownTimestamp = 0
let pointerUpTimestamp = 0
let pointerDownOnCanvas = false

function getInteractedElement(
  e: MouseEvent | TouchEvent,
): InteractedElement | null {
  const { x, y } = getInteractionCoordinates(e)

  // Find the winning block first (deepest nesting level, then highest z-index).
  // Some blocks might not render anything and thus have a height of 0.
  // All registered block rects enforce a minimum height.
  const visibleUuids = dom.getVisibleBlocks()

  let deepestUuid = ''
  let deepestLevel = -1

  for (let i = 0; i < visibleUuids.length; i++) {
    const uuid = visibleUuids[i]
    if (!uuid) {
      continue
    }
    const rect = dom.getBlockRect(uuid)
    if (!rect) {
      continue
    }
    const level = state.getNestingLevel(uuid)
    if (level < deepestLevel) {
      continue
    }
    const relativeRect = ui.getViewportRelativeRect(rect)
    if (!isInsideRect(x, y, relativeRect)) {
      continue
    }
    if (level > deepestLevel) {
      deepestUuid = uuid
      deepestLevel = level
    } else if (fields.compareFieldPriority(uuid, deepestUuid) > 0) {
      // Same nesting level: prefer the block from the field with higher z-index.
      deepestUuid = uuid
    }
  }

  // While Ctrl is held, skip editable/droppable fields so double-click goes
  // straight to the block (item:doubleClick — opens the block's edit form).
  const skipFields = keyboard.isPressingControl.value

  // Check if there is an editable at this point that belongs to the winning block.
  const editableField = skipFields ? null : directive.getEditableAtPoint(x, y)
  if (editableField) {
    const editableUuid =
      editableField.type === itemEntityType ? editableField.uuid : undefined

    // Skip editable fields on blocks where the user lacks edit permission
    // or that are inside a restricted ancestor.
    const canEdit =
      !editableUuid ||
      (permissions.checkBlockBundlePermission(editableField.bundle, 'edit') &&
        !permissions.blockHasRestrictedAncestor(editableUuid))

    // Use the editable if it belongs to the winning block, or if it's on a
    // non-block entity (e.g. the host entity).
    if (canEdit && (!editableUuid || editableUuid === deepestUuid)) {
      return {
        editableFieldName: editableField.fieldName,
        uuid: editableUuid,
        timestamp: Date.now(),
        x,
        y,
      }
    }
  }

  // Check if there is a droppable field at this point that belongs to the winning block.
  // Only reference-type droppables participate in double-click-to-open — link
  // droppables (e.g. URL fields) have no edit overlay, so we don't want them
  // to swallow the double-click that should open the block's edit form.
  const droppableField = skipFields ? null : directive.getDroppableAtPoint(x, y)
  if (droppableField) {
    const config = types.getDroppableFieldConfig(
      droppableField.fieldName,
      droppableField,
    )
    if (config.type === 'reference') {
      const droppableUuid =
        droppableField.type === itemEntityType ? droppableField.uuid : undefined
      if (!droppableUuid || droppableUuid === deepestUuid) {
        return {
          droppableFieldName: droppableField.fieldName,
          droppableEntityType: droppableField.type,
          droppableEntityUuid: droppableField.uuid,
          uuid: droppableUuid,
          timestamp: Date.now(),
          x,
          y,
        }
      }
    }
  }

  if (deepestUuid) {
    // If the deepest block is inside a restricted ancestor, resolve to that
    // ancestor so that click, drag, and selection all target the right block.
    const restrictedAncestor = permissions.getRestrictedAncestor(deepestUuid)

    return {
      uuid: restrictedAncestor ?? deepestUuid,
      timestamp: Date.now(),
      x,
      y,
    }
  }

  return null
}

function onPointerMove(e: PointerEvent) {
  if (!handlePointerMove) {
    return
  }
  if (ui.isApproving.value) {
    return
  }
  if (keyboard.isPressingSpace.value || e.buttons & MOUSE_BUTTONS.AUXILIARY) {
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
        items: toDraggableExisting(selection.items.value),
        coords: { x: e.clientX, y: e.clientY },
        mode: 'mouse',
      })
    } else {
      const block = blocks.getBlock(interacted.uuid)
      if (block) {
        eventBus.emit('dragging:start', {
          items: toDraggableExisting(block),
          coords: { x: e.clientX, y: e.clientY },
          mode: 'mouse',
        })
      }
    }
    canvasEl.value?.removeEventListener('pointermove', onPointerMove)
  }
}

function onPointerDown(e: PointerEvent) {
  if (e.buttons & MOUSE_BUTTONS.AUXILIARY) {
    return
  }

  if (ui.isApproving.value) {
    return
  }

  pointerDownOnCanvas = true

  if (canvasEl.value) {
    canvasEl.value.focus()
  }

  if (!keyboard.isPressingSpace.value) {
    e.preventDefault()
    e.stopPropagation()
    e.stopImmediatePropagation()
  }
  // Set the state of the pressed shortcuts.
  keyboard.setShortcutStateFromEvent(e)

  canvasEl.value?.removeEventListener('pointermove', onPointerMove)

  // When a field-level editing mode is active, only track the pointer down
  // on canvas (so click-away works) but skip all block interaction logic.
  if (selection.activeFieldLabel.value) {
    return
  }

  // Prevent starting any interactions if a tooltip is open.
  if (ui.openTooltip.value) {
    return
  }

  if (state.isLoading.value) {
    return
  }
  handlePointerMove = true

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
  if (e.button === MOUSE_BUTTON.AUXILIARY) {
    e.preventDefault()
    return
  }
  if (ui.isApproving.value) {
    return
  }
  handlePointerMove = false
  e.preventDefault()
  e.stopPropagation()
  e.stopImmediatePropagation()

  // If a tooltip is open, close it and prevent all other interactions.
  // Don't close the tooltip when an editable field is active, as the user
  // may be selecting text and releasing the pointer outside the overlay.
  if (ui.openTooltip.value && !selection.activeFieldLabel.value) {
    ui.openTooltip.value = ''
    return
  }
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
  if (selection.activeFieldLabel.value) {
    if (pointerDownOnCanvas) {
      eventBus.emit('window:clickAway')
      lastInteractedElement = null
    }
    pointerDownOnCanvas = false
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
      clicked.editableFieldName === lastInteractedElement.editableFieldName ||
      clicked.droppableFieldName === lastInteractedElement.droppableFieldName)
  ) {
    const deltaTime = Date.now() - pointerUpTimestamp
    const deltaX = Math.abs(lastInteractedElement.x - e.clientX)
    const deltaY = Math.abs(lastInteractedElement.y - e.clientY)
    if (deltaTime < 400 && deltaX < 3 && deltaY < 3) {
      if (clicked.editableFieldName) {
        pointerDownOnCanvas = false
        eventBus.emit('editable:open', {
          fieldName: clicked.editableFieldName,
          uuid: clicked.uuid,
        })
        return
      }
      if (
        clicked.droppableFieldName &&
        clicked.droppableEntityUuid &&
        clicked.droppableEntityType
      ) {
        pointerDownOnCanvas = false
        eventBus.emit('droppable:open', {
          fieldName: clicked.droppableFieldName,
          uuid: clicked.droppableEntityUuid,
          entityType: clicked.droppableEntityType,
        })
        return
      }
      if (lastInteractedElement.uuid) {
        const block = blocks.getBlock(lastInteractedElement.uuid)
        if (!block) {
          return
        }
        // Persist any pending option changes before opening the edit/translate
        // form, which is built from server state.
        ui.flushPendingChanges().then(() =>
          eventBus.emit('item:doubleClick', block),
        )
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

  // Prevent starting any interactions if a tooltip is open.
  if (ui.openTooltip.value) {
    return
  }

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
          items: toDraggableExisting(selection.items.value),
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

  // If a tooltip is open, close it and prevent all other interactions.
  if (ui.openTooltip.value) {
    ui.openTooltip.value = ''
    return
  }

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
  if (ui.isApproving.value) {
    const { x, y } = getInteractionCoordinates(e)
    const editableField = directive.getEditableAtPoint(x, y)
    if (editableField) {
      eventBus.emit('editable:focus', {
        fieldName: editableField.fieldName,
        uuid:
          editableField.type === itemEntityType
            ? editableField.uuid
            : undefined,
      })
    }
    return
  }
  if (
    canvasEl.value &&
    !selection.activeFieldLabel.value &&
    !ui.hasTooltipOpen.value
  ) {
    canvasEl.value.focus()
  }
}

const canvasEl = useTemplateRef('canvasEl')

// Watch for canvas element changes (happens when :key changes)
watch(
  canvasEl,
  (newCanvas, oldCanvas) => {
    // Clean up old canvas
    if (oldCanvas) {
      handlePointerMove = false
      animation.removeCanvasElement()
    }

    // Set up new canvas
    if (newCanvas) {
      animation.setCanvasElement(newCanvas)
      // Request a draw now that the canvas is fully set up
      // This ensures we redraw after WebGL enable/disable toggles
      animation.requestDraw()
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  animation.removeCanvasElement()
  handlePointerMove = false
})
</script>
