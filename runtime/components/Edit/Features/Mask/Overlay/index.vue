<template>
  <div class="bk-canvas-area" :style="canvasAreaStyle">
    <div v-for="area in canvasFieldAreas" :style="area.style" />
  </div>
</template>

<script lang="ts" setup>
import { AnimationFrameEvent } from '#blokkli/types'

const { eventBus } = useBlokkli()

type CanvasFieldArea = {
  style: Record<string, string>
}

const canvasFieldAreas = ref<CanvasFieldArea[]>([])
const canvasArea = ref<DOMRect | null>(null)

const canvasAreaStyle = computed(() => {
  if (!canvasArea.value) {
    return
  }
  return {
    width: canvasArea.value.width + 'px',
    height: canvasArea.value.height + 'px',
    transform: `translate(${canvasArea.value.x}px, ${canvasArea.value.y}px)`,
  }
})

function onAnimationFrame(e: AnimationFrameEvent) {
  canvasFieldAreas.value = e.fieldAreas
    .filter((v) => !v.isNested)
    .map((v) => {
      return {
        style: {
          width: v.rect.width + 'px',
          height: v.rect.height + 'px',
          top: v.rect.top - e.canvasRect.top + 'px',
          left: v.rect.left - e.canvasRect.left + 'px',
        },
      }
    })

  canvasArea.value = e.canvasRect
}

onMounted(() => {
  eventBus.on('animationFrame', onAnimationFrame)
})

onBeforeUnmount(() => {
  eventBus.off('animationFrame', onAnimationFrame)
})
</script>
