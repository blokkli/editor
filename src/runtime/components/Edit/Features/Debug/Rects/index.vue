<template>
  <div class="bk-debug-rects">
    <canvas
      ref="canvasRects"
      :style="{
        width: ui.viewport.value.width + 'px',
        height: ui.viewport.value.height + 'px',
      }"
    />
  </div>
</template>

<script setup lang="ts">
import { useBlokkli, ref } from '#imports'
import { intersects } from '#blokkli/helpers'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'

const { ui, dom } = useBlokkli()

const canvasRects = ref<HTMLCanvasElement | null>(null)

onBlokkliEvent('canvas:draw', (e) => {
  if (!canvasRects.value) {
    return
  }

  canvasRects.value.width = ui.viewport.value.width
  canvasRects.value.height = ui.viewport.value.height

  const ctx = canvasRects.value.getContext('2d')
  if (!ctx) {
    return
  }
  ctx.clearRect(0, 0, ui.viewport.value.width, ui.viewport.value.height)
  ctx.strokeStyle = 'blue'
  const blockRects = dom.getBlockRects()
  const viewport = ui.visibleViewport.value

  const rects = Object.values(blockRects)

  for (let i = 0; i < rects.length; i++) {
    const rect = rects[i]

    const drawnRect = {
      x: rect.x * e.artboardScale + e.artboardOffset.x,
      y: rect.y * e.artboardScale + e.artboardOffset.y,
      width: rect.width * e.artboardScale,
      height: rect.height * e.artboardScale,
    }
    if (intersects(drawnRect, viewport)) {
      ctx.beginPath()
      ctx.rect(drawnRect.x, drawnRect.y, drawnRect.width, drawnRect.height)
      ctx.stroke()
    }
  }

  ctx.strokeStyle = 'red'

  const visibleFieldRects = dom.getVisibleFields()
  for (let i = 0; i < visibleFieldRects.length; i++) {
    const key = visibleFieldRects[i]

    const rect = dom.getFieldRect(key)

    if (!rect) {
      continue
    }

    const drawnRect = {
      x: rect.x * e.artboardScale + e.artboardOffset.x,
      y: rect.y * e.artboardScale + e.artboardOffset.y,
      width: rect.width * e.artboardScale,
      height: rect.height * e.artboardScale,
    }
    if (intersects(drawnRect, viewport)) {
      ctx.beginPath()
      ctx.rect(drawnRect.x, drawnRect.y, drawnRect.width, drawnRect.height)
      ctx.stroke()
    }
  }
})
</script>
