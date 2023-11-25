<template>
  <Teleport to="body">
    <div
      v-show="selectedParagraphs.length && !isDragging"
      class="pb pb-paragraph-actions pb-control"
    >
      <div :style="styleSize" class="pb-paragraph-actions-overlay">
        <div
          v-for="rect in selectedRects"
          :style="{
            width: rect.width + 'px',
            height: rect.height + 'px',
            transform: `translate(${rect.left}px, ${rect.top}px)`,
          }"
        ></div>
      </div>

      <div class="pb-paragraph-actions-inner" :style="innerStyle">
        <div id="pb-paragraph-actions-title" />

        <div class="pb-paragraph-actions-buttons" id="pb-paragraph-actions" />

        <div id="pb-paragraph-actions-after"></div>

        <div
          class="pb-paragraph-actions-buttons"
          id="pb-paragraph-actions-options"
        />
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { buildDraggableItem, falsy } from '#pb/helpers'
import { AnimationFrameEvent, KeyPressedEvent } from '#pb/types'

type Rectangle = {
  left: number
  top: number
  width: number
  height: number
}

const { selectedParagraphs, isDragging, eventBus } = useParagraphsBuilderStore()

const bounds = ref<Rectangle>({ width: 0, height: 0, left: 0, top: 0 })
const selectedRects = ref<Rectangle[]>([])

const innerStyle = computed(() => {
  const x = Math.max(bounds.value.left, 80)
  const y = Math.min(Math.max(bounds.value.top, 120), window.innerHeight)
  return {
    transform: `translate(${x}px, ${y}px)`,
  }
})

const styleSize = computed(() => {
  if (!bounds.value) {
    return {}
  }

  const { width, height, left, top } = bounds.value

  return {
    transform: `translate(${left}px, ${top}px)`,
    width: width + 'px',
    height: height + 'px',
  }
})

function getBounds(rects: DOMRect[]): Rectangle | undefined {
  if (!rects.length) {
    return
  }

  const firstRect = rects[0]
  let minX = firstRect.x
  let minY = firstRect.y
  let maxX = minX + firstRect.width
  let maxY = minY + firstRect.height

  for (const rect of rects.slice(1)) {
    minX = Math.min(minX, rect.x)
    minY = Math.min(minY, rect.y)
    maxX = Math.max(maxX, rect.x + rect.width)
    maxY = Math.max(maxY, rect.y + rect.height)
  }

  return {
    left: minX,
    top: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

function onAnimationFrame(e: AnimationFrameEvent) {
  if (!selectedParagraphs.value.length) {
    return
  }
  const rects = selectedParagraphs.value
    .map((paragraph) => {
      return e.rects[paragraph.uuid]
    })
    .filter(falsy)
  const newBounds = getBounds(rects)
  if (newBounds) {
    bounds.value.top = newBounds.top
    bounds.value.left = newBounds.left
    bounds.value.width = newBounds.width
    bounds.value.height = newBounds.height
  }

  if (selectedParagraphs.value.length === 1) {
    selectedRects.value = []
  } else {
    selectedRects.value = selectedParagraphs.value
      .map((paragraph) => {
        const rect = e.rects[paragraph.uuid]
        if (rect) {
          return {
            width: rect.width,
            height: rect.height,
            top: rect.y - bounds.value.top,
            left: rect.x - bounds.value.left,
          }
        }
      })
      .filter(falsy)
  }
}

function modulo(n: number, m: number) {
  return ((n % m) + m) % m
}

function onKeyPressed(e: KeyPressedEvent) {
  if (selectedParagraphs.value.length !== 1) {
    return
  }
  if (e.code !== 'Tab') {
    return
  }

  e.originalEvent.preventDefault()

  const paragraphs = [
    ...document.querySelectorAll('[data-uuid]'),
  ] as HTMLElement[]
  if (!paragraphs.length) {
    return
  }

  const currentIndex = selectedParagraphs.value[0]
    ? paragraphs.findIndex(
        (v) => v.dataset.uuid === selectedParagraphs.value[0].uuid,
      )
    : -1

  const targetIndex = modulo(
    e.shift ? currentIndex - 1 : currentIndex + 1,
    paragraphs.length,
  )
  const targetElement = paragraphs[targetIndex]
  if (!targetElement) {
    return
  }
  const targetItem = buildDraggableItem(targetElement)
  if (!targetItem) {
    return
  }

  if (targetItem.itemType !== 'existing') {
    return
  }

  eventBus.emit('select', targetItem.uuid)
  eventBus.emit('paragraph:scrollIntoView', targetItem.uuid)
}

onMounted(() => {
  eventBus.on('animationFrame', onAnimationFrame)
  eventBus.on('keyPressed', onKeyPressed)
})

onUnmounted(() => {
  eventBus.off('animationFrame', onAnimationFrame)
  eventBus.off('keyPressed', onKeyPressed)
})
</script>

<script lang="ts">
export default {
  name: 'ParagraphActions',
}
</script>
