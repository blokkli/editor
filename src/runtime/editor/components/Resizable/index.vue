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
    <button
      class="bk-resizable-handle bk-is-vertical"
      @mousedown="onMouseDown"
    />
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

<style lang="postcss">
.bk-resizable {
  @apply absolute left-0 w-full;
  @screen md {
    @apply relative w-auto;
  }
  &.bk-is-resizing {
    @apply cursor-ew-resize;
    .bk-resizable-inner {
      @apply pointer-events-none;
    }
    .bk-resizable-handle {
      @apply opacity-100;
    }
  }
}

.bk-resizable-handle {
  @apply opacity-50 hover:opacity-100 transition;

  &:hover:before {
    @apply !bg-mono-400/40;
  }
  &:before {
    content: '';
    @apply bg-mono-400/25 absolute;
  }
  &:after {
    content: '';
    @apply absolute bg-mono-100 pointer-events-none;
  }

  &.bk-is-vertical {
    @apply hidden;
    @screen md {
      @apply block;
      @apply absolute top-0 -left-10 w-[20px] h-full cursor-ew-resize z-resizable;
      &:before {
        @apply top-0 h-full left-10 w-[12px];
      }
      &:after {
        @apply top-1/2 -translate-y-1/2 h-100 w-[5px] left-[13px] border-x-2 border-x-mono-400;
      }
    }
  }
}
</style>
