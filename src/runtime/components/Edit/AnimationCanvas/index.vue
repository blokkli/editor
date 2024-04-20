<template>
  <Teleport to="body">
    <div class="bk bk-animation-canvas">
      <canvas id="bk-animation-canvas" ref="canvas" v-bind="canvasAttributes" />
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import { ref, computed, useBlokkli } from '#imports'

const { ui } = useBlokkli()

const canvas = ref<HTMLCanvasElement | null>(null)

const ratio = computed(() => {
  if (ui.isMobile.value) {
    return window.devicePixelRatio
  }
  return Math.min(window.devicePixelRatio, 2)
})

const canvasAttributes = computed(() => {
  return {
    width: ui.viewport.value.width * ratio.value,
    height: ui.viewport.value.height * ratio.value,
    style: {
      width: ui.viewport.value.width + 'px',
      height: ui.viewport.value.height + 'px',
    },
  }
})

let lastCanvasWidth = 0
let lastCanvasHeight = 0

onBlokkliEvent('animationFrame:before', () => {
  const ctx = canvas.value?.getContext('2d')
  if (!ctx || !canvas.value) {
    return
  }
  const newWidth = ui.viewport.value.width * ratio.value
  const newHeight = ui.viewport.value.height * ratio.value
  if (lastCanvasWidth !== newWidth || lastCanvasHeight !== newHeight) {
    canvas.value.width = newWidth
    canvas.value.height = newHeight
    lastCanvasWidth = newWidth
    lastCanvasHeight = newHeight
    ctx.scale(ratio.value, ratio.value)
  }

  ctx.clearRect(
    0,
    0,
    canvasAttributes.value.width,
    canvasAttributes.value.height,
  )

  const clipRect = ui.visibleViewport.value

  ctx.beginPath()
  ctx.rect(clipRect.x, clipRect.y, clipRect.width, clipRect.height)
  ctx.clip()
})
</script>
