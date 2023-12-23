<template>
  <div v-if="styleSize" :style="styleSize" class="bk bk-selection">
    <div
      v-for="rect in selectedRects"
      :key="rect.uuid"
      :style="{
        width: rect.width + 'px',
        height: rect.height + 'px',
        transform: `translate(${rect.x}px, ${rect.y}px)`,
      }"
    />
  </div>
</template>

<script lang="ts" setup>
import { falsy, getBounds } from '#blokkli/helpers'
import type { DraggableExistingBlokkliItem, Rectangle } from '#blokkli/types'
import { computed, useBlokkli, onMounted, onBeforeUnmount } from '#imports'

const props = defineProps<{
  blocks: DraggableExistingBlokkliItem[]
}>()

const { ui } = useBlokkli()

const delayedRefresh = ref(1)
let interval: any = null

type SelectedRect = Rectangle & { uuid: string }

type BoundsRectable = Rectangle & { isVisible: boolean }

const bounds = computed<BoundsRectable | null>(() => {
  const scale = ui.getArtboardScale()
  const rects = props.blocks
    .map((block) => {
      const element = block.element()
      if (element instanceof HTMLElement) {
        return element.getBoundingClientRect()
      }
    })
    .filter(falsy)

  const boundingBox = getBounds(rects)
  if (!boundingBox) {
    return null
  }

  const artboardEl = ui.artboardElement()
  const artboardRect = artboardEl.getBoundingClientRect()
  const artboardScroll = artboardEl.scrollTop

  return {
    x: (boundingBox.x - artboardRect.x) / scale,
    y: (boundingBox.y - artboardRect.y) / scale + artboardScroll,
    width: boundingBox.width / scale,
    height: boundingBox.height / scale,
    isVisible: !!delayedRefresh.value,
  }
})

const selectedRects = computed<SelectedRect[]>(() => {
  if (!bounds.value || !delayedRefresh.value) {
    return []
  }
  const scale = ui.getArtboardScale()
  const artboardEl = ui.artboardElement()
  const artboardRect = artboardEl.getBoundingClientRect()
  const artboardScroll = artboardEl.scrollTop

  const rects: SelectedRect[] = []

  for (let i = 0; i < props.blocks.length; i++) {
    const block = props.blocks[i]
    const element = block.element()
    const rect = element.getBoundingClientRect()
    rects.push({
      x: (rect.x - artboardRect.x) / scale - bounds.value.x,
      y: (rect.y - artboardRect.y) / scale - bounds.value.y + artboardScroll,
      width: rect.width / scale,
      height: element.scrollHeight,
      uuid: block.uuid,
    })
  }

  return rects
})

const styleSize = computed(() => {
  if (!bounds.value) {
    return null
  }

  const { width, height, x, y } = bounds.value

  return {
    transform: `translate(${x}px, ${y}px)`,
    width: width + 'px',
    height: height + 'px',
  }
})

onMounted(() => {
  interval = setInterval(() => {
    delayedRefresh.value += 1
  }, 200)
})

onBeforeUnmount(() => {
  clearInterval(interval)
})
</script>

<script lang="ts">
export default {
  name: 'SelectionOverlay',
}
</script>
