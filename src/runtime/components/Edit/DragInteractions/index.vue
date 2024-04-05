<template>
  <slot></slot>
</template>

<script setup lang="ts">
import type { Coord } from '#blokkli/types'
import { onBeforeUnmount, onMounted, useBlokkli } from '#imports'

const { dom, eventBus, selection, keyboard } = useBlokkli()

const rootEl = dom.getActiveProviderElement()

let longPressTimeout: any = null

const findBlock = (targets: EventTarget[]) => {
  for (let i = 0; i < targets.length; i++) {
    const target = targets[i]
    if (target instanceof HTMLElement) {
      if (target.dataset.elementType === 'existing') {
        const uuid = target.dataset.uuid
        if (uuid) {
          return uuid
        }
      }
    }
  }
}

function onClick(e: MouseEvent) {
  e.preventDefault()
}

function handleBlockClick(uuid: string) {
  if (keyboard.isPressingControl.value || selection.isMultiSelecting.value) {
    eventBus.emit('select:toggle', uuid)
  } else if (selection.uuids.value.includes(uuid)) {
    eventBus.emit('select:toggle', uuid)
  } else {
    eventBus.emit('select', uuid)
  }
}

function onMouseUp(e: MouseEvent) {
  rootEl.removeEventListener('mousemove', onMouseMove)
  if (selection.isDragging.value) {
    return
  }
  const uuid = findBlock(e.composedPath())
  if (!uuid) {
    return
  }
  e.stopPropagation()
  handleBlockClick(uuid)
}

let touchStartCoordinates: Coord | null = null

function onTouchStart(e: TouchEvent) {
  clearTimeout(longPressTimeout)
  window.removeEventListener('touchmove', onTouchMove)

  const uuid = findBlock(e.composedPath())
  if (!uuid) {
    return
  }

  rootEl.addEventListener('touchmove', onTouchMove)
  touchStartCoordinates = { x: e.touches[0].clientX, y: e.touches[0].clientY }

  longPressTimeout = setTimeout(() => {
    rootEl.removeEventListener('touchmove', onTouchMove)
    // Block is already selected. Start dragging.
    if (selection.uuids.value.includes(uuid) && touchStartCoordinates) {
      eventBus.emit('dragging:start', {
        items: [...selection.blocks.value],
        coords: touchStartCoordinates,
        mode: 'touch',
      })
      return
    }
    // Start multiselecting.
    eventBus.emit('select:start', [...selection.uuids.value, uuid])
  }, 500)
}

function onTouchMove(e: TouchEvent) {
  if (!touchStartCoordinates) {
    return
  }
  const diffX = Math.abs(e.touches[0].clientX - touchStartCoordinates.x)
  const diffY = Math.abs(e.touches[0].clientY - touchStartCoordinates.y)
  if (diffX > 10 || diffY > 10) {
    clearTimeout(longPressTimeout)
    rootEl.removeEventListener('touchmove', onTouchMove)
  }
}

function onTouchEnd() {
  clearTimeout(longPressTimeout)
  rootEl.removeEventListener('touchmove', onTouchMove)
}

let mouseStartCoordinates: Coord | null = null

function onMouseDown(e: MouseEvent) {
  const uuid = findBlock(e.composedPath())
  if (!uuid) {
    return
  }

  rootEl.addEventListener('mousemove', onMouseMove)
  mouseStartCoordinates = { x: e.clientX, y: e.clientY }
}

function onMouseMove(e: MouseEvent) {
  if (!mouseStartCoordinates) {
    rootEl.removeEventListener('mousemove', onMouseMove)
    return
  }
  const deltaX = Math.abs(mouseStartCoordinates.x - e.clientX)
  const deltaY = Math.abs(mouseStartCoordinates.y - e.clientY)
  if (deltaX > 3 || deltaY > 3) {
    rootEl.removeEventListener('mousemove', onMouseMove)
    const uuid = findBlock(e.composedPath())
    if (!uuid) {
      return
    }

    // Move happened over another block. Drag this one instead.
    if (!selection.uuids.value.includes(uuid)) {
      eventBus.emit('select', uuid)
    }
    eventBus.emit('dragging:start', {
      items: [...selection.blocks.value],
      coords: mouseStartCoordinates,
      mode: 'mouse',
    })
  }
}

onMounted(() => {
  rootEl.addEventListener('touchend', onTouchEnd)
  rootEl.addEventListener('touchstart', onTouchStart)
  rootEl.addEventListener('mousedown', onMouseDown)
  rootEl.addEventListener('mouseup', onMouseUp)
  rootEl.addEventListener('click', onClick, {
    capture: true,
  })
})

onBeforeUnmount(() => {
  rootEl.removeEventListener('touchend', onTouchEnd)
  rootEl.removeEventListener('touchmove', onTouchMove)
  rootEl.removeEventListener('touchstart', onTouchStart)
  rootEl.removeEventListener('mouseup', onMouseUp)
  rootEl.removeEventListener('mousedown', onMouseDown)
  rootEl.removeEventListener('mousemove', onMouseMove)
  rootEl.removeEventListener('click', onClick, {
    capture: true,
  })
})
</script>
