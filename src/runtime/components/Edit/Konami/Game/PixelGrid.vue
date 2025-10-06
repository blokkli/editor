<template>
  <canvas
    ref="canvasPixelGrid"
    :width="canvasPixelGridWidth"
    :height="canvasPixelGridHeight"
    class="bk-is-pixel-grid"
  />
</template>

<script setup lang="ts">
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import { computed, useTemplateRef, watch } from '#imports'

const props = defineProps<{
  canvasScale: number
  canvasWidth: number
  canvasHeight: number
}>()

const canvasPixelGrid = useTemplateRef('canvasPixelGrid')

const canvasPixelGridWidth = computed(() => {
  return props.canvasWidth * props.canvasScale * window.devicePixelRatio
})

const canvasPixelGridHeight = computed(() => {
  return props.canvasHeight * props.canvasScale * window.devicePixelRatio
})

let needsUpdate = true

const key = computed(() => {
  return [
    props.canvasScale,
    props.canvasWidth,
    props.canvasHeight,
    canvasPixelGridHeight.value,
    canvasPixelGridWidth.value,
  ].join('-')
})

watch(key, () => {
  needsUpdate = true
})

// Draw pixel grid overlay (only needs to be called once)
function drawPixelGrid() {
  const canvas = canvasPixelGrid.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const dpr = window.devicePixelRatio
  const scale = props.canvasScale * dpr
  const width = canvas.width
  const height = canvas.height

  const currentScale = props.canvasScale

  // Calculate line width based on scale
  const lineWidth =
    currentScale >= 4 ? 1.25 : Math.max(1, Math.round(scale * 0.07))

  // Clear canvas
  ctx.clearRect(0, 0, width, height)

  ctx.fillStyle = '#717b14'

  // Draw vertical lines (every pixel)
  for (let x = scale; x < width; x += scale) {
    const xPos = Math.round(x) - lineWidth / 2
    ctx.fillRect(xPos, 0, lineWidth, height)
  }

  // Draw horizontal lines (every pixel)
  for (let y = scale; y < height; y += scale) {
    const yPos = Math.round(y) - lineWidth / 2
    ctx.fillRect(0, yPos, width, lineWidth)
  }
}

onBlokkliEvent('canvas:draw', () => {
  if (needsUpdate) {
    drawPixelGrid()
    needsUpdate = false
  }
})
</script>
