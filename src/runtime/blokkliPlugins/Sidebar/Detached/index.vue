<template>
  <ViewportBlockingRect
    :id="storageKey"
    ref="el"
    class="bk-sidebar-detached"
    :class="{ 'bk-is-focused': focusedSidebar === id }"
    :style="style"
    tabindex="10"
    @mousedown.stop="onSidebarMouseDown"
    @mouseup.stop
    @pointermove="onPointerMove"
    @focus.capture="onFocus"
  >
    <div class="bk">
      <div
        class="bk-sidebar-title"
        @mousedown.stop="onMouseDown($event, 'move')"
      >
        <slot name="icon">
          <Icon v-if="icon" :name="icon" />
        </slot>
        <span>{{ title }}</span>
        <button
          @click.prevent.stop.capture="isMinimized = !isMinimized"
          @mousedown.capture.stop
        >
          <Icon :name="isMinimized ? 'window-maximize' : 'window-minimize'" />
        </button>
        <button
          @click.prevent.stop.capture="$emit('close')"
          @mousedown.capture.stop
        >
          <Icon name="close" />
        </button>
      </div>
    </div>
    <div class="bk-sidebar-detached-inner" :style="innerStyle">
      <slot :width="userWidth" :height="userHeight"></slot>
      <template v-if="!size && !isMinimized">
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
      </template>
    </div>
  </ViewportBlockingRect>
</template>

<script lang="ts" setup>
import {
  useBlokkli,
  ref,
  onBeforeUnmount,
  computed,
  watch,
  useState,
} from '#imports'
import { Icon, ViewportBlockingRect } from '#blokkli/components'
import type { BlokkliIcon } from '#blokkli/icons'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'

const props = withDefaults(
  defineProps<{
    id: string
    title: string
    icon: BlokkliIcon
    minWidth?: number
    minHeight?: number
    size?: { width: number; height: number }
    isLeft?: boolean
  }>(),
  {
    minWidth: 300,
    minHeight: 300,
    size: undefined,
  },
)

defineEmits(['close'])

const { storage, ui, keyboard, selection } = useBlokkli()

function onPointerMove(e: PointerEvent) {
  if (keyboard.isPressingSpace.value || selection.isDragging.value) {
    return
  }

  e.stopPropagation()
}

const BASE_Z = 190000

const isMinimized = storage.use(
  computed(() => 'sidebar:detached:minimized:' + props.id),
  false,
)
const storageKey = computed(() => 'sidebar:detached:size:' + props.id)
const focusedSidebar = storage.use('sidebar:focused', '')
const zStorageKey = computed(() => 'sidebar:detached:zIndex:' + props.id)
const globalZ = useState('blokkli:zIndex', () => BASE_Z)
const z = storage.use(zStorageKey.value, BASE_Z)

if (z.value > globalZ.value) {
  globalZ.value = z.value
}

const onSidebarMouseDown = () => {
  onFocus()
  isResizing.value = true
  window.addEventListener('mouseup', onMouseUp)
}

const offsetX = computed(() => {
  if (
    x.value + width.value >
    ui.visibleViewport.value.x + ui.visibleViewport.value.width
  ) {
    return (
      x.value +
      width.value -
      (ui.visibleViewport.value.x + ui.visibleViewport.value.width) +
      15
    )
  } else if (x.value < ui.visibleViewport.value.x) {
    return x.value - ui.visibleViewport.value.x - 15
  }
  return 0
})

const storedData = storage.use(storageKey, {
  x: props.isLeft ? 0 : window.innerWidth - 360,
  y: 50,
  width: 360,
  height: 520,
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
const userWidth = ref(storedData.value.width)
const userHeight = ref(storedData.value.height)

const width = computed(() => {
  return props.size?.width || userWidth.value
})

const height = computed(() => {
  return props.size?.height || userHeight.value
})

const headerHeight = computed(() => 40)

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

watch(mouseMode, (mode) => {
  mode
    ? document.documentElement.classList.add('bk-is-sidebar-interacting')
    : document.documentElement.classList.remove('bk-is-sidebar-interacting')
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
}

watch(
  () => props.size,
  () => {
    updateStored()
  },
)

const style = computed(() => {
  return {
    transform: `translate(${x.value - offsetX.value}px, ${y.value}px)`,
    zIndex: z.value,
  }
})

const innerStyle = computed(() => {
  return {
    width: (props.size?.width || width.value) + 'px',
    height: isMinimized.value ? 0 : (props.size?.height || height.value) + 'px',
  }
})

const onFocus = () => {
  focusedSidebar.value = props.id
  globalZ.value++
  z.value = globalZ.value
}

const onMouseDown = (e: MouseEvent, mode: MouseMode) => {
  mouseMode.value = mode
  startMouseX.value = e.clientX
  startMouseY.value = e.clientY

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}

const setCoordinates = (newX: number, newY: number) => {
  x.value = Math.min(
    Math.max(newX, ui.visibleViewport.value.x),
    ui.visibleViewport.value.width + ui.visibleViewport.value.x - width.value,
  )
  y.value = Math.min(
    Math.max(newY, ui.visibleViewport.value.y),
    ui.visibleViewport.value.y +
      ui.visibleViewport.value.height -
      headerHeight.value,
  )
}

const setSizes = (newWidth?: number, newHeight?: number) => {
  if (newWidth !== undefined) {
    userWidth.value = Math.min(
      Math.max(newWidth, props.minWidth),
      window.innerWidth - 300,
    )
  }
  if (newHeight !== undefined) {
    userHeight.value = Math.min(
      Math.max(newHeight, props.minHeight),
      window.innerHeight - 50,
    )
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
}

recalculatePositions()

watch(offsetX, () => {
  updateStored()
})

onBlokkliEvent('ui:resized', () => {
  recalculatePositions()
  updateStored()
})

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
})
</script>
