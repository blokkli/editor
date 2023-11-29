<template>
  <Teleport to="body">
    <div
      v-show="selection.blocks.value.length && !selection.isDragging.value"
      class="pb pb-paragraph-actions pb-control"
      @click.stop
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
        <div class="pb-paragraph-actions-controls">
          <div id="pb-paragraph-actions-title" />

          <div class="pb-paragraph-actions-buttons" id="pb-paragraph-actions" />

          <div
            class="pb-paragraph-actions-buttons"
            id="pb-paragraph-actions-options"
          />
        </div>
        <div id="pb-paragraph-actions-after"></div>
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { falsy, modulo } from '#pb/helpers'
import { AnimationFrameEvent, KeyPressedEvent } from '#pb/types'

type Rectangle = {
  left: number
  top: number
  width: number
  height: number
}

const { selection, eventBus, dom } = useParagraphsBuilderStore()

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
  if (!selection.blocks.value.length) {
    return
  }
  const rects = selection.blocks.value
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

  if (selection.blocks.value.length === 1) {
    selectedRects.value = []
  } else {
    selectedRects.value = selection.blocks.value
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

function onKeyPressed(e: KeyPressedEvent) {
  if (selection.blocks.value.length !== 1) {
    return
  }
  if (e.code !== 'Tab') {
    return
  }

  e.originalEvent.preventDefault()

  const items = dom.getAllBlocks()
  if (!items.length) {
    return
  }

  const currentIndex = selection.blocks.value[0]
    ? items.findIndex((v) => v.uuid === selection.blocks.value[0].uuid)
    : -1

  const targetIndex = modulo(
    e.shift ? currentIndex - 1 : currentIndex + 1,
    items.length,
  )
  const targetItem = items[targetIndex]
  if (!targetItem) {
    return
  }

  eventBus.emit('select', targetItem.uuid)
  eventBus.emit('paragraph:scrollIntoView', { uuid: targetItem.uuid })
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
