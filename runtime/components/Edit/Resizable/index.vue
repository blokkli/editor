<template>
  <div
    class="pb-resizable"
    @wheel.stop=""
    :style="{ width: width + 'px' }"
    :class="{ 'pb-is-resizing': isResizing }"
  >
    <div class="pb-resizable-inner">
      <slot></slot>
    </div>
    <button @mousedown="onMouseDown" class="pb-resizable-handle"></button>
  </div>
</template>

<script lang="ts" setup>
const LOCALSTORAGE_KEY = '_pb_resizeable_frame_width'
const width = ref(600)
const startX = ref(0)
const startWidth = ref(0)
const isResizing = ref(false)

const fromStorage = window.localStorage.getItem(LOCALSTORAGE_KEY)
if (fromStorage) {
  const value = parseInt(fromStorage)
  if (value) {
    width.value = value
  }
}

function onMouseMove(e: MouseEvent) {
  e.stopPropagation()
  e.preventDefault()
  width.value = Math.max(
    Math.min(startWidth.value + (startX.value - e.x), window.innerWidth - 200),
    350,
  )
}

function onMouseUp(e: MouseEvent) {
  e.stopPropagation()
  e.preventDefault()
  isResizing.value = false
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
}

function onMouseDown(e: MouseEvent) {
  startX.value = e.x
  startWidth.value = width.value
  isResizing.value = true
  e.preventDefault()
  e.stopPropagation()

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
  window.localStorage.setItem(LOCALSTORAGE_KEY, width.value.toString())
})
</script>
