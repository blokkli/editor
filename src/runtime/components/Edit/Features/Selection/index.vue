<template>
  <Teleport to=".bk-main-canvas">
    <div
      v-if="styleSize"
      :style="styleSize"
      class="bk bk-selection"
      :class="{ 'bk-is-invisible': !bounds?.isVisible }"
    >
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
  </Teleport>
</template>

<script lang="ts" setup>
import { getBounds } from '#blokkli/helpers'
import type { Rectangle } from '#blokkli/types'
import { computed, useBlokkli } from '#imports'

const { selection, ui } = useBlokkli()

type SelectedRect = Rectangle & { uuid: string }

type BoundsRectable = Rectangle & { isVisible: boolean }

const bounds = computed<BoundsRectable | null>(() => {
  const scale = ui.getArtboardScale()
  const rects = selection.blocks.value.map((block) => {
    return block.element.getBoundingClientRect()
  })

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
    isVisible:
      !selection.isChangingOptions.value &&
      !selection.isDragging.value &&
      !selection.editableActive.value,
  }
})

const selectedRects = computed<SelectedRect[]>(() => {
  if (!bounds.value) {
    return []
  }
  const scale = ui.getArtboardScale()
  const artboardEl = ui.artboardElement()
  const artboardRect = artboardEl.getBoundingClientRect()
  const artboardScroll = artboardEl.scrollTop

  const rects: SelectedRect[] = []

  for (let i = 0; i < selection.blocks.value.length; i++) {
    const block = selection.blocks.value[i]
    const rect = block.element.getBoundingClientRect()
    rects.push({
      x: (rect.x - artboardRect.x) / scale - bounds.value.x,
      y: (rect.y - artboardRect.y) / scale - bounds.value.y + artboardScroll,
      width: rect.width / scale,
      height: rect.height / scale,
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
</script>

<script lang="ts">
export default {
  name: 'Selection',
}
</script>
