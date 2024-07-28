<template>
  <Teleport to="body">
    <div
      ref="scrollbarEl"
      class="bk bk-artboard-scrollbar"
      :class="[
        { 'bk-is-active': isDraggingThumb },
        'bk-orientation-' + orientation,
      ]"
      @touchstart.prevent
      @mousedown.stop.prevent="onClickScrollbar"
    >
      <button ref="button" @mousedown.capture.prevent.stop="onThumbMouseDown" />
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import { ref, onBeforeUnmount, onMounted } from '#imports'

const isDraggingThumb = ref(false)

const props = defineProps<{
  padding: number
  offset: number
  rootSize: number
  artboardSize: number
  scale: number
  orientation: 'height' | 'width'
}>()

type ScrollbarOptions = {
  padding?: number
  orientation?: 'height' | 'width'
}

class Scrollbar {
  scrollStart = 0
  thumbStart = 0
  scrollbarSize = 0
  padding = 50
  offset = 0
  rootSize = 0
  artboardSize = 0
  scale = 1
  orientation: 'height' | 'width' = 'height'

  constructor(options?: ScrollbarOptions) {
    this.padding = options?.padding || this.padding
    this.orientation = options?.orientation || this.orientation
  }

  getMouseCoordinate(e: MouseEvent): number {
    return this.orientation === 'height' ? e.clientY : e.clientX
  }
}

const scrollbar = new Scrollbar(props)

const scrollbarEl = ref<HTMLElement | null>(null)
const button = ref<HTMLButtonElement | null>(null)

const emit = defineEmits(['pageUp', 'pageDown', 'setOffset'])

let scrollStart = 0
let thumbStart = 0
let scrollbarSize = 300

const scrollTop = () =>
  Math.round(props.offset - props.rootSize + props.padding)

// The scroll progress as a value from 0 to 1.
const scrollProgress = () => Math.abs(scrollTop() / scrollSize())
const thumbOffset = () => (scrollbarSize - scrollThumbSize()) * scrollProgress()

const scrollSize = () =>
  props.artboardSize * props.scale + props.rootSize - 2 * props.padding

const scrollThumbSize = () => (props.rootSize / scrollSize()) * props.rootSize

function onThumbMouseDown(e: MouseEvent) {
  isDraggingThumb.value = true
  scrollStart = scrollbar.getMouseCoordinate(e)
  thumbStart = thumbOffset()
  document.body.addEventListener('mouseup', onMouseUp, {
    passive: false,
    capture: true,
  })
  document.body.addEventListener('mousemove', onThumbMouseMove, {
    passive: false,
    capture: true,
  })
}

function onMouseUp() {
  isDraggingThumb.value = false
  document.body.removeEventListener('mousemove', onThumbMouseMove, {
    capture: true,
  })
  document.body.removeEventListener('mouseup', onMouseUp, {
    capture: true,
  })
}

function getOffsetFromThumb(newThumb: number): number {
  const maxThumb = scrollbarSize - scrollThumbSize()
  const newScrollProgress = newThumb / maxThumb
  const newScrollOffset = newScrollProgress * scrollSize()
  return newScrollOffset + props.rootSize - props.padding
}

function onThumbMouseMove(e: MouseEvent) {
  const diff = scrollStart - scrollbar.getMouseCoordinate(e)
  const newThumb = Math.max(
    Math.min(-thumbStart + diff, 0),
    -(scrollbarSize - scrollThumbSize()),
  )
  emit('setOffset', getOffsetFromThumb(newThumb))
}

function getStyle() {
  const offset = thumbOffset()
  const size = scrollThumbSize()
  if (props.orientation === 'height') {
    return {
      height: size + 'px',
      transform: `translateY(${offset}px)`,
    }
  }
  return {
    width: size + 'px',
    transform: `translateX(${offset}px)`,
  }
}

function onClickScrollbar(e: MouseEvent) {
  if (e.offsetY < thumbOffset()) {
    emit('pageUp')
  } else {
    emit('pageDown')
  }
}

const observer = new ResizeObserver((entries) => {
  const size = entries[0]?.contentBoxSize?.[0]
  if (!size) {
    return
  }

  scrollbarSize =
    props.orientation === 'height' ? size.blockSize : size.inlineSize
})

onBlokkliEvent('animationFrame', () => {
  if (!button.value) {
    return
  }

  const style = getStyle()

  button.value.style.width = style.width || ''
  button.value.style.height = style.height || ''
  button.value.style.transform = style.transform
})

onMounted(() => {
  if (scrollbarEl.value) {
    observer.observe(scrollbarEl.value)
  }
})

onBeforeUnmount(() => {
  observer.disconnect()
})
</script>
