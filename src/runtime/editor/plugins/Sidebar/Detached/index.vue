<template>
  <ViewportBlockingRect
    :id="storageKey"
    ref="root"
    class="bk bk-sidebar-detached bk-sidebar-inner"
    :class="{ 'bk-is-focused': focusedSidebar === id }"
    :style="style"
    tabindex="10"
    @pointermove="onPointerMove"
    @focus.capture="onFocus"
  >
    <ScrollBoundary>
      <div
        class="bk-sidebar-title"
        @mousedown.stop="onMouseDown($event, 'move')"
      >
        <div class="bk-sidebar-title-icon">
          <slot name="icon">
            <Icon v-if="icon" :name="icon" />
          </slot>
        </div>
        <span>{{ title }}</span>
        <button
          @click.prevent.stop.capture="isMinimized = !isMinimized"
          @mousedown.capture.stop
        >
          <Icon :name="isMinimized ? 'window-maximize' : 'window-minimize'" />
        </button>
        <button
          @click.prevent.stop.capture="$emit('attach')"
          @mousedown.capture.stop
        >
          <Icon
            :name="
              region === 'left' ? 'bk_mdi_dock_to_right' : 'bk_mdi_dock_to_left'
            "
          />
        </button>
      </div>
      <div class="bk-sidebar-detached-inner" :style="innerStyle">
        <slot
          :width="userWidth"
          :height="userHeight"
          :is-resizing="isResizing"
        />
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
    </ScrollBoundary>
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
  useTemplateRef,
} from '#imports'
import {
  Icon,
  ViewportBlockingRect,
  ScrollBoundary,
} from '#blokkli/editor/components'
import type { BlokkliIcon } from '#blokkli-build/icons'
import type { SidebarRegion } from '#blokkli/editor/types/ui'
import { addElementClasses, onBlokkliEvent } from '#blokkli/editor/composables'

const props = withDefaults(
  defineProps<{
    id: string
    title: string
    icon: BlokkliIcon
    minWidth?: number
    minHeight?: number
    region: SidebarRegion
    size?: { width: number; height: number }
  }>(),
  {
    minWidth: 300,
    minHeight: 300,
    size: undefined,
  },
)

defineEmits<{
  (e: 'attach'): void
}>()

const root = useTemplateRef('root')

function getRootElement(): HTMLElement | null {
  return root.value?.getRootElement() ?? null
}

const isLeft = computed(() => props.region === 'left')

const { storage, ui, keyboard, selection } = useBlokkli()

function onPointerMove(e: PointerEvent) {
  if (keyboard.isPressingSpace.value || selection.isDragging.value) {
    return
  }

  e.stopPropagation()
}

const isMinimized = storage.use(
  computed(() => 'sidebar:detached:minimized:' + props.id),
  false,
)
const storageKey = computed(() => 'sidebar:detached:size:' + props.id)
const focusedSidebar = storage.use('sidebar:focused', '')
const zStorageKey = computed(() => 'sidebar:detached:zindexOffset:' + props.id)
// Store just the offset from the base z-index (starting at 0)
const globalZOffset = useState('blokkli:zOffset', () => 0)
const zOffset = storage.use(zStorageKey.value, 0)

if (zOffset.value > globalZOffset.value) {
  globalZOffset.value = zOffset.value
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
  x: isLeft.value ? 0 : window.innerWidth - 360,
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

const mouseMode = ref<MouseMode>('')

const isResizing = computed(() => mouseMode.value.includes('resize'))

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
const startX = ref(0)
const startY = ref(0)
const startWidth = ref(0)
const startHeight = ref(0)

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

addElementClasses(
  document.documentElement,
  'bk-is-sidebar-interacting',
  mouseMode,
)

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
    zIndex: `calc(var(--bk-z-index-sidebar-detached) + ${zOffset.value})`,
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
  globalZOffset.value++
  zOffset.value = globalZOffset.value
}

const onMouseDown = (e: MouseEvent, mode: MouseMode) => {
  mouseMode.value = mode
  startMouseX.value = e.clientX
  startMouseY.value = e.clientY
  // The visual position is `x - offsetX` (see `style` above). When the
  // viewport shrinks (e.g. another sidebar attaches) `offsetX` visually
  // pulls the sidebar back into view without changing `x`. Absorb that
  // offset into `x` so the drag baseline matches the visual position;
  // otherwise the first mousemove would jump by `offsetX`.
  if (offsetX.value !== 0) {
    x.value = x.value - offsetX.value
  }
  // Re-clamp position first (viewport may have shrunk since the last
  // interaction), then size — `setSizes` uses the final x/y to compute
  // maxWidth/maxHeight.
  setCoordinates(x.value, y.value)
  clampSizeToViewport()
  // Capture the current position/size as the drag baseline so that clamping
  // or stale storedData from a previous session can't offset subsequent drags.
  startX.value = x.value
  startY.value = y.value
  startWidth.value = width.value
  startHeight.value = height.value

  window.addEventListener('pointermove', onMouseMove, { capture: true })
  window.addEventListener('pointerup', onMouseUp, { capture: true })
}

const setCoordinates = (newX: number, newY: number) => {
  // Inner `min` applies the right/bottom bound, outer `max` applies the
  // left/top bound. When the two conflict (width > VV.width or height >
  // VV.height) the left/top bound wins, keeping the sidebar inside the
  // viewport; the size clamp that follows then reduces the size. The
  // reverse order leaves `x` / `y` outside the viewport when the stored
  // size exceeds the current viewport.
  x.value = Math.max(
    Math.min(
      newX,
      ui.visibleViewport.value.x + ui.visibleViewport.value.width - width.value,
    ),
    ui.visibleViewport.value.x,
  )
  y.value = Math.max(
    Math.min(
      newY,
      ui.visibleViewport.value.y +
        ui.visibleViewport.value.height -
        headerHeight.value,
    ),
    ui.visibleViewport.value.y,
  )
}

const setSizes = (newWidth?: number, newHeight?: number) => {
  // Symmetric with the position clamps in `setCoordinates`: the width
  // constraint mirrors `x + width ≤ visibleViewport.right`, the height
  // constraint mirrors `y + height ≤ visibleViewport.bottom`. Inner `min`
  // applies the max, outer `max` applies the min — so `minWidth` /
  // `minHeight` always wins if the two conflict (a cramped viewport prefers
  // overflowing the edge over a sub-usable sidebar with buttons cut off).
  if (newWidth !== undefined) {
    const maxWidth =
      ui.visibleViewport.value.x + ui.visibleViewport.value.width - x.value
    userWidth.value = Math.max(Math.min(newWidth, maxWidth), props.minWidth)
  }
  if (newHeight !== undefined) {
    const maxHeight =
      ui.visibleViewport.value.y + ui.visibleViewport.value.height - y.value
    userHeight.value = Math.max(Math.min(newHeight, maxHeight), props.minHeight)
  }
}

/**
 * Clamp `userWidth` / `userHeight` using the same max that `setSizes` uses
 * during manual resizing. Used on load (a saved size from a previously-
 * larger viewport may exceed the current viewport, putting title buttons
 * off-screen) and on drag start (viewport may have shrunk since the last
 * interaction, e.g. another sidebar attached).
 */
const clampSizeToViewport = () => {
  setSizes(userWidth.value, userHeight.value)
}

const onMouseMove = (e: MouseEvent) => {
  if (mouseMode.value === 'move') {
    setCoordinates(
      startX.value + e.clientX - startMouseX.value,
      startY.value + e.clientY - startMouseY.value,
    )
  } else if (mouseMode.value === 'resize-right') {
    setSizes(startWidth.value + e.clientX - startMouseX.value)
  } else if (mouseMode.value === 'resize-bottom') {
    setSizes(undefined, startHeight.value + e.clientY - startMouseY.value)
  } else if (mouseMode.value === 'resize-bottom-right') {
    setSizes(
      startWidth.value + e.clientX - startMouseX.value,
      startHeight.value + e.clientY - startMouseY.value,
    )
  }
}

const onMouseUp = () => {
  isDragging.value = false
  mouseMode.value = ''
  window.removeEventListener('pointermove', onMouseMove, { capture: true })
  window.removeEventListener('pointerup', onMouseUp, { capture: true })

  updateStored()
}

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

// Position first: `setCoordinates` now keeps x/y inside the viewport even
// when stored size exceeds viewport. `clampSizeToViewport` then shrinks
// size based on the final x/y, so both constraints end up consistent.
recalculatePositions()
clampSizeToViewport()

watch(offsetX, () => {
  updateStored()
})

onBlokkliEvent('ui:resized', () => {
  recalculatePositions()
  updateStored()
})

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onMouseMove, { capture: true })
  window.removeEventListener('pointerup', onMouseUp, { capture: true })
})

defineExpose({
  getRootElement,
})
</script>
