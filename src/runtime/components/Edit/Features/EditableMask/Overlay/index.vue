<template>
  <div class="bk-canvas-area" :style="canvasAreaStyle">
    <div v-for="(area, i) in canvasFieldAreas" :key="i" :style="area.style" />
  </div>
</template>

<script lang="ts" setup>
import { ref, computed } from '#imports'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'

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

onBlokkliEvent('animationFrame', (e) => {
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
})
</script>
