<template>
  <Teleport to="body">
    <div
      ref="scrollbar"
      class="bk-artboard-scrollbar"
      :class="[
        { 'bk-is-active': isDraggingThumb },
        'bk-orientation-' + orientation,
      ]"
      @touchstart.prevent
      @mousedown.stop.prevent="onClickScrollbar"
    >
      <button
        :style="scrollbarStyle"
        @mousedown.capture.prevent.stop="onThumbMouseDown"
      />
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import useAnimationFrame from '#blokkli/helpers/composables/useAnimationFrame'
import { ref, computed, useBlokkli, onBeforeUnmount, onMounted } from '#imports'

const isDraggingThumb = ref(false)

const { ui } = useBlokkli()

const props = defineProps<{
  padding: number
  offset: number
  rootSize: number
  artboardSize: number
  scale: number
  orientation: 'height' | 'width'
}>()

const scrollbar = ref<HTMLElement | null>(null)

const emit = defineEmits(['pageUp', 'pageDown', 'scrollStart', 'setOffset'])

const scrollStart = ref(0)
const scrollStartOffset = ref(0)
const thumbStart = ref(0)
const scrollbarSize = ref(300)

function getMouseCoordinate(e: MouseEvent): number {
  return props.orientation === 'height' ? e.clientY : e.clientX
}

function onThumbMouseDown(e: MouseEvent) {
  isDraggingThumb.value = true
  scrollStart.value = getMouseCoordinate(e)
  scrollStartOffset.value = props.offset
  thumbStart.value = thumbOffset.value
  emit('scrollStart')
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
  const maxThumb = scrollbarSize.value - scrollThumbSize.value
  const newScrollProgress = newThumb / maxThumb
  const newScrollOffset = newScrollProgress * scrollSize.value
  const newOffset = newScrollOffset + props.rootSize - props.padding
  return newOffset
}

function onThumbMouseMove(e: MouseEvent) {
  const diff = scrollStart.value - getMouseCoordinate(e)
  const newThumb = Math.max(
    Math.min(-thumbStart.value + diff, 0),
    -(scrollbarSize.value - scrollThumbSize.value),
  )
  emit('setOffset', getOffsetFromThumb(newThumb))
}

// const scrollbarWrapperStyle = computed(() => ({
//   right:
//     Math.round(
//       ui.viewport.value.width -
//         ui.visibleViewportPadded.value.width -
//         ui.visibleViewportPadded.value.x,
//     ) + 'px',
// }))

const scrollbarStyle = computed(() => {
  if (props.orientation === 'height') {
    return {
      height: scrollThumbSize.value + 'px',
      transform: `translateY(${thumbOffset.value}px)`,
    }
  }
  return {
    width: scrollThumbSize.value + 'px',
    transform: `translateX(${thumbOffset.value}px)`,
  }
})

const scrollSize = computed(
  () => props.artboardSize * props.scale + props.rootSize - 2 * props.padding,
)

const scrollTop = computed(() =>
  Math.round(props.offset - props.rootSize + props.padding),
)

// The scroll progress as a value from 0 to 1.
const scrollProgress = computed(() =>
  Math.abs(scrollTop.value / scrollSize.value),
)

const scrollThumbSize = computed(
  () => (props.rootSize / scrollSize.value) * props.rootSize,
)

const thumbOffset = computed(
  () => (scrollbarSize.value - scrollThumbSize.value) * scrollProgress.value,
)

function onClickScrollbar(e: MouseEvent) {
  if (e.offsetY < thumbOffset.value) {
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

  if (props.orientation === 'height') {
    scrollbarSize.value = size.blockSize
  } else {
    scrollbarSize.value = size.inlineSize
  }
})

onMounted(() => {
  if (scrollbar.value) {
    observer.observe(scrollbar.value)
  }
})

onBeforeUnmount(() => {
  observer.disconnect()
})
</script>
