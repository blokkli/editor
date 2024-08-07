<template>
  <div
    class="bk-resizable"
    :style="style"
    :class="{ 'bk-is-resizing': isResizing }"
    @wheel.passive.stop
  >
    <div class="bk-resizable-inner">
      <slot />
    </div>
    <button class="bk-resizable-handle" @mousedown="onMouseDown" />
  </div>
</template>

<script lang="ts" setup>
import { ref, useBlokkli, computed, onBeforeUnmount } from '#imports'

const { storage, ui } = useBlokkli()

const props = defineProps<{
  id: string
}>()

const storageKey = computed(() => 'resizable:width:' + props.id)
const persistedWidth = storage.use(storageKey, 600)
const width = ref(persistedWidth.value)
const startX = ref(0)
const startWidth = ref(0)
const isResizing = ref(false)

const style = computed(() => {
  if (ui.isMobile.value) {
    return {}
  }

  return { width: width.value + 'px' }
})

function onMouseMove(e: MouseEvent) {
  if (ui.isMobile.value) {
    return
  }
  e.stopPropagation()
  e.preventDefault()
  width.value = Math.max(
    Math.min(
      startWidth.value + (startX.value - e.clientX),
      window.innerWidth - 200,
    ),
    350,
  )
}

function onMouseUp(e: MouseEvent) {
  if (ui.isMobile.value) {
    return
  }
  e.stopPropagation()
  e.preventDefault()
  isResizing.value = false
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
  persistedWidth.value = width.value
}

function onMouseDown(e: MouseEvent) {
  if (ui.isMobile.value || e.button !== 0) {
    return
  }
  startX.value = e.clientX
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

<script lang="ts">
export default {
  name: 'Resizable',
}
</script>
