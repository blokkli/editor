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
import { useBlokkli, useTemplateRef } from '#imports'
import { falsy, } from '#blokkli/helpers'
import { intersects } from '#blokkli/editor/helpers/geometry'
import { onBlokkliEvent } from '#blokkli/editor/composables'
import type { Coord, Rectangle } from '#blokkli/editor/types/geometry'

const { ui, dom, directive } = useBlokkli()

const canvasRects = useTemplateRef('canvasRects')

function drawRects(
  ctx: CanvasRenderingContext2D,
  rects: Rectangle[],
  scale: number,
  offset: Coord,
  viewport: Rectangle,
) {
  for (let i = 0; i < rects.length; i++) {
    const rect = rects[i]!

    const drawnRect = {
      x: rect.x * scale + offset.x,
      y: rect.y * scale + offset.y,
      width: rect.width * scale,
      height: rect.height * scale,
    }
    if (intersects(drawnRect, viewport)) {
      ctx.beginPath()
      ctx.rect(drawnRect.x, drawnRect.y, drawnRect.width, drawnRect.height)
      ctx.stroke()
    }
  }
}

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

  const rects = Object.values(blockRects).filter(v => v !== undefined)
  drawRects(ctx, rects, e.artboardScale, e.artboardOffset, viewport)

  ctx.strokeStyle = 'red'

  const visibleFieldRects = dom
    .getVisibleFields()
    .map((key) => {
      return dom.getFieldRect(key)
    })
    .filter(falsy)
  drawRects(ctx, visibleFieldRects, e.artboardScale, e.artboardOffset, viewport)

  ctx.strokeStyle = 'green'
  const editableRects = directive.getVisible('editable')
  drawRects(ctx, editableRects, e.artboardScale, e.artboardOffset, viewport)
})
</script>
