<template>
  <Teleport to="body">
    <div v-if="isVisible" class="bk bk-dragging-overlay" :style="style" />
  </Teleport>
</template>

<script lang="ts" setup>
import { ref, computed, useBlokkli, onMounted, onUnmounted } from '#imports'

import type { AnimationFrameEvent, DraggableStartEvent } from '#blokkli/types'

const { eventBus } = useBlokkli()

const isVisible = ref(false)
const width = ref(0)
const height = ref(0)
const x = ref(0)
const y = ref(0)
const mouseX = ref(0)
const mouseY = ref(0)
const offsetX = ref(0)
const offsetY = ref(0)

const style = computed(() => {
  return {
    width: width.value + 'px',
    height: height.value + 'px',
    transform: `translate(${mouseX.value - offsetX.value}px, ${
      mouseY.value - offsetY.value
    }px)`,
  }
})

function loop(e: AnimationFrameEvent) {
  mouseX.value = e.mouseX
  mouseY.value = e.mouseY
  if (!isVisible.value) {
    offsetX.value = mouseX.value - x.value
    offsetY.value = mouseY.value - y.value
    isVisible.value = true
  }
}

function onDraggingStart(e: DraggableStartEvent) {
  width.value = e.rect.width
  height.value = e.rect.height
  x.value = e.rect.x
  y.value = e.rect.y

  eventBus.on('animationFrame', loop)
}

function onDraggingEnd() {
  isVisible.value = false
  eventBus.off('animationFrame', loop)
}

onMounted(() => {
  eventBus.on('dragging:start', onDraggingStart)
  eventBus.on('dragging:end', onDraggingEnd)
})

onUnmounted(() => {
  eventBus.off('dragging:start', onDraggingStart)
  eventBus.off('dragging:end', onDraggingEnd)
})
</script>
