<template>
  <div
    ref="el"
    class="bk-sidebar-detached"
    :style="style"
    tabindex="10"
    @mousedown.stop="onSidebarMouseDown"
  >
    <div class="bk">
      <div class="bk-sidebar-title" @mousedown="onMouseDown($event, 'move')">
        <slot name="icon">
          <Icon v-if="icon" :name="icon" />
        </slot>
        <span>{{ title }}</span>
        <button @click.prevent.stop="$emit('close')">
          <Icon name="close" />
        </button>
      </div>
    </div>
    <div class="bk-sidebar-detached-inner">
      <slot></slot>
      <div
        class="bk-sidebar-detached-handle bk-is-bottom"
        @mousedown.stop.prevent="onMouseDown($event, 'resize-bottom')"
      />
      <div
        class="bk-sidebar-detached-handle bk-is-right"
        @mousedown.stop.prevent="onMouseDown($event, 'resize-right')"
      />
      <div
        class="bk-sidebar-detached-handle bk-is-bottom-right"
        @mousedown.stop.prevent="onMouseDown($event, 'resize-bottom-right')"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useBlokkli } from '#imports'
import { Icon } from '#blokkli/components'
import type { BlokkliIcon } from '#blokkli/icons'

const props = defineProps<{
  id: string
  title: string
  icon?: BlokkliIcon
}>()

defineEmits(['close'])

const { storage, eventBus, ui } = useBlokkli()

const storageKey = computed(() => 'sidebar:detached:size:' + props.id)

const onSidebarMouseDown = () => {
  isResizing.value = true
  window.addEventListener('mouseup', onMouseUp)
}

const storedData = storage.use(storageKey, {
  x: 0,
  y: 50,
  width: 360,
  height: 360,
  viewportWidth: 0,
  viewportHeight: 0,
})

type MouseMode =
  | 'move'
  | 'resize-right'
  | 'resize-bottom'
  | 'resize-bottom-right'
  | ''

const isDragging = ref(false)
const isResizing = ref(false)

const mouseMode = ref<MouseMode>('')

const x = ref(0)
const y = ref(0)
const width = ref(storedData.value.width)
const height = ref(storedData.value.height)

const startMouseX = ref(0)
const startMouseY = ref(0)

const rootCursor = computed(() => {
  switch (mouseMode.value) {
    case 'resize-bottom-right':
      return 'se-resize'
    case 'resize-bottom':
      return 'ns-resize'
    case 'resize-right':
      return 'ew-resize'
    case 'move':
      return 'move'
  }

  return ''
})

watch(rootCursor, (cursor) => {
  document.documentElement.style.cursor = cursor
})

const updateStored = () => {
  storedData.value = {
    x: x.value,
    y: y.value,
    width: width.value,
    height: height.value,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
  }
  ui.setViewportBlockingRectangle(storageKey.value, storedData.value)
}

const style = computed(() => {
  return {
    width: width.value + 'px',
    height: height.value + 'px',
    transform: `translate(${x.value}px, ${y.value}px)`,
  }
})

const onMouseDown = (e: MouseEvent, mode: MouseMode) => {
  mouseMode.value = mode
  startMouseX.value = e.clientX
  startMouseY.value = e.clientY

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}

const setCoordinates = (newX: number, newY: number) => {
  x.value = Math.min(Math.max(newX, 0), window.innerWidth - width.value)
  y.value = Math.min(Math.max(newY, 50), window.innerHeight - 40)
}

const setSizes = (newWidth?: number, newHeight?: number) => {
  if (newWidth !== undefined) {
    width.value = Math.min(Math.max(newWidth, 300), window.innerWidth - 300)
  }
  if (newHeight !== undefined) {
    height.value = Math.min(Math.max(newHeight, 300), window.innerHeight - 50)
  }
}

const onMouseMove = (e: MouseEvent) => {
  if (mouseMode.value === 'move') {
    setCoordinates(
      storedData.value.x + e.clientX - startMouseX.value,
      storedData.value.y + e.clientY - startMouseY.value,
    )
  } else if (mouseMode.value === 'resize-right') {
    setSizes(storedData.value.width + e.clientX - startMouseX.value)
  } else if (mouseMode.value === 'resize-bottom') {
    setSizes(undefined, storedData.value.height + e.clientY - startMouseY.value)
  } else if (mouseMode.value === 'resize-bottom-right') {
    setSizes(
      storedData.value.width + e.clientX - startMouseX.value,
      storedData.value.height + e.clientY - startMouseY.value,
    )
  }
}

const onMouseUp = () => {
  isDragging.value = false
  isResizing.value = false
  mouseMode.value = ''
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)

  updateStored()
}

const el = ref<HTMLDivElement | null>(null)

const recalculatePositions = () => {
  const storedViewportWidth =
    storedData.value.viewportWidth || window.innerWidth
  const storedViewportHeight =
    storedData.value.viewportHeight || window.innerHeight
  const diffWidth = window.innerWidth - storedViewportWidth + width.value
  const diffHeight = window.innerHeight - storedViewportHeight

  if (x.value > window.innerWidth / 2) {
    setCoordinates(x.value + diffWidth, y.value + diffHeight)
  } else {
    setCoordinates(storedData.value.x, storedData.value.y)
  }

  storedData.value.viewportWidth = window.innerWidth
  storedData.value.viewportHeight = window.innerHeight
  ui.setViewportBlockingRectangle(storageKey.value, storedData.value)
}

const onUiResized = () => {
  recalculatePositions()
}

recalculatePositions()

onMounted(() => {
  eventBus.on('ui:resized', onUiResized)
  ui.setViewportBlockingRectangle(storageKey.value, storedData.value)
})

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
  eventBus.off('ui:resized', onUiResized)
  ui.setViewportBlockingRectangle(storageKey.value)
})
</script>
