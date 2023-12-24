<template>
  <div
    class="bk-sidebar-detached"
    :style="style"
    tabindex="10"
    @mousedown.stop="onSidebarMouseDown"
    ref="el"
  >
    <div class="bk">
      <div class="bk-sidebar-title" @mousedown="onMouseDown">
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

const { storage, eventBus } = useBlokkli()

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

const isDragging = ref(false)
const isResizing = ref(false)

const x = ref(0)
const y = ref(0)
const width = ref(storedData.value.width)
const height = ref(storedData.value.height)

const startX = ref(0)
const startY = ref(0)
const startMouseX = ref(0)
const startMouseY = ref(0)

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

const style = computed(() => {
  return {
    width: width.value + 'px',
    height: height.value + 'px',
    transform: `translate(${x.value}px, ${y.value}px)`,
  }
})

const onMouseDown = (e: MouseEvent) => {
  startX.value = x.value
  startY.value = y.value
  startMouseX.value = e.clientX
  startMouseY.value = e.clientY

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}

const setCoordinates = (newX: number, newY: number) => {
  x.value = Math.min(Math.max(newX, 0), window.innerWidth - width.value)
  y.value = Math.max(newY, 50)
}

const onMouseMove = (e: MouseEvent) => {
  setCoordinates(
    startX.value + e.clientX - startMouseX.value,
    startY.value + e.clientY - startMouseY.value,
  )
}

const onMouseUp = (e: MouseEvent) => {
  isDragging.value = false
  isResizing.value = false
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)

  updateStored()
}

const el = ref<HTMLDivElement | null>(null)
let timeout: any = null

const resizeObserver = new ResizeObserver((entries) => {
  const entry = entries[0]
  if (!entry) {
    return
  }

  clearTimeout(timeout)

  if (!isResizing.value) {
    return
  }

  timeout = setTimeout(() => {
    width.value = Math.round(entry.contentRect.width)
    height.value = Math.round(entry.contentRect.height)
    updateStored()
  }, 500)
})

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

const onUiResized = () => {
  recalculatePositions()
}

recalculatePositions()

onMounted(() => {
  if (el.value) {
    resizeObserver.observe(el.value)
  }

  eventBus.on('ui:resized', onUiResized)
})

onBeforeUnmount(() => {
  if (el.value) {
    resizeObserver.unobserve(el.value)
  }
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
  eventBus.off('ui:resized', onUiResized)
})
</script>
