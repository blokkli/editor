<template>
  <div v-if="styleSize" :style="styleSize" class="bk bk-selection">
    <div
      v-for="rect in selectedRects"
      :key="rect.uuid"
      class="bk-selectable bk-is-active"
      :style="{
        width: rect.width + 'px',
        height: rect.height + 'px',
        transform: `translate(${rect.x}px, ${rect.y}px)`,
        borderRadius: rect.style.radiusString,
        outlineColor: rect.style.contrastColor,
        '--bk-tw-ring-color': rect.style.contrastColorTranslucent,
      }"
    />
  </div>
</template>

<script lang="ts" setup>
import { falsy, getBounds, getDraggableStyle } from '#blokkli/helpers'
import type {
  DraggableExistingBlock,
  DraggableStyle,
  Rectangle,
} from '#blokkli/types'
import { ref, computed, useBlokkli, onMounted, onBeforeUnmount } from '#imports'

const props = defineProps<{
  blocks: DraggableExistingBlock[]
}>()

const { ui } = useBlokkli()

const delayedRefresh = ref(1)
let interval: any = null

type SelectedRect = Rectangle & {
  uuid: string
  style: DraggableStyle
}

type BoundsRectable = Rectangle & { isVisible: boolean }

const bounds = computed<BoundsRectable | null>(() => {
  const artboardEl = ui.artboardElement()
  const artboardRect = artboardEl.getBoundingClientRect()
  const artboardScroll = artboardEl.scrollTop
  const scale = ui.getArtboardScale()
  const rects = props.blocks
    .map((block) => {
      const element = block.dragElement()
      if (element instanceof HTMLElement) {
        const rect = element.getBoundingClientRect()
        return {
          x: (rect.x - artboardRect.x) / scale,
          y: (rect.y - artboardRect.y) / scale,
          width: element.offsetWidth,
          height: element.offsetHeight,
        }
      }
    })
    .filter(falsy)

  const boundingBox = getBounds(rects)
  if (!boundingBox) {
    return null
  }

  return {
    x: boundingBox.x,
    y: boundingBox.y + artboardScroll,
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
    const element = block.dragElement()
    const rect = element.getBoundingClientRect()
    const style = getDraggableStyle(element)
    rects.push({
      x: (rect.x - artboardRect.x) / scale - bounds.value.x,
      y: (rect.y - artboardRect.y) / scale - bounds.value.y + artboardScroll,
      width:
        element instanceof HTMLElement
          ? element.offsetWidth
          : element.scrollWidth,
      height:
        element instanceof HTMLElement
          ? element.offsetHeight
          : element.scrollHeight,
      uuid: block.uuid,
      style,
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
