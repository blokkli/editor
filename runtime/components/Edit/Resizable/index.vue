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
const { storage } = useBlokkli()

const persistedWidth = storage.use('resizable:width', 600)
const width = ref(persistedWidth.value)
const startX = ref(0)
const startWidth = ref(0)
const isResizing = ref(false)

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
  persistedWidth.value = width.value
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
})
</script>
