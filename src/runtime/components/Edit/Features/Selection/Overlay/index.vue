<template>
  <div />
</template>

<script lang="ts" setup>
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import type { DraggableExistingBlock } from '#blokkli/types'
import { useBlokkli } from '#imports'

defineProps<{
  blocks: DraggableExistingBlock[]
}>()

const { ui, selection } = useBlokkli()

onBlokkliEvent('animationFrame', ({ ctx }) => {
  const scale = ui.artboardScale.value
  const offset = ui.artboardOffset.value
  const rects = selection.rects.value
  ctx.lineDashOffset = 0
  ctx.setLineDash([])

  for (let i = 0; i < rects.length; i++) {
    const { x, y, width, height, style } = rects[i]
    const rectX = (x + offset.x / scale) * scale
    const rectY = (y + offset.y / scale) * scale
    ctx.strokeStyle = style.contrastColor
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.roundRect(rectX, rectY, width * scale, height * scale, [
      style.radius[0] * scale,
      style.radius[1] * scale,
      style.radius[2] * scale,
      style.radius[3] * scale,
    ])
    ctx.stroke()
  }
})
</script>

<script lang="ts">
export default {
  name: 'SelectionOverlay',
}
</script>
