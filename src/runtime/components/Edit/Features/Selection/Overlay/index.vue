<template>
  <div />
</template>

<script lang="ts" setup>
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import type { Coord, DraggableExistingBlock, Rectangle } from '#blokkli/types'
import { useBlokkli, onBeforeUnmount } from '#imports'
import {
  createProgramInfo,
  setBuffersAndAttributes,
  drawBufferInfo,
  type BufferInfo,
  setUniforms,
} from 'twgl.js'
import vs from './vertex.glsl?raw'
import fs from './fragment.glsl?raw'
import { RectangleBufferCollector } from '#blokkli/helpers/webgl'
import { toShaderColor } from '#blokkli/helpers'

const props = defineProps<{
  blocks: DraggableExistingBlock[]
}>()

const { animation, theme } = useBlokkli()

const gl = animation.gl()
const programInfo = createProgramInfo(gl, [vs, fs])

type SelectionRectangle = Rectangle & {
  id: string
  index: number
  isInverted: boolean
  radius: [number, number, number, number]
}

class SelectionRectangleBufferCollector extends RectangleBufferCollector<SelectionRectangle> {
  uuids: string[] = []
  getBufferInfo(
    offset: Coord,
    scale: number,
  ): { info: BufferInfo | null; hasChanged: boolean } {
    const uuidsNew = props.blocks.map((v) => v.uuid)
    const uuidsCurrent = [...this.added.values()]
    const hasChanged =
      uuidsCurrent.length !== uuidsNew.length ||
      uuidsNew.some((v) => !uuidsCurrent.includes(v))
    if (hasChanged) {
      this.reset()
      for (let i = 0; i < props.blocks.length; i++) {
        const block = props.blocks[i]
        if (this.added.has(block.uuid)) {
          continue
        }
        this.added.add(block.uuid)
        const el = block.dragElement()
        const rect = el.getBoundingClientRect()
        const style = theme.getDraggableStyle(el)
        this.addRectangle(
          {
            id: block.uuid,
            x: rect.x / scale - offset.x / scale,
            y: rect.y / scale - offset.y / scale,
            width: rect.width / scale,
            height: rect.height / scale,
            radius: style.radius,
            isInverted: style.isInverted,
          },
          style.isInverted ? 1 : 0,
        )
      }
    }

    // Only update the buffer info if it has changed.
    if (hasChanged) {
      this.bufferInfo = this.createBufferInfo()
    }

    return { info: this.bufferInfo, hasChanged }
  }
}

const collector = new SelectionRectangleBufferCollector(gl)

const uniforms = {
  u_color_default: toShaderColor(theme.accent.value[700]),
  u_color_inverted: [255, 255, 255],
}

onBlokkliEvent('canvas:draw', (e) => {
  gl.useProgram(programInfo.program)

  setUniforms(programInfo, uniforms)
  animation.setSharedUniforms(gl, programInfo)
  const { info, hasChanged } = collector.getBufferInfo(
    e.artboardOffset,
    e.artboardScale,
  )

  // Nothing to draw.
  if (!info) {
    return
  }

  // Only update buffer and attributes when they have changed.
  if (hasChanged) {
    setBuffersAndAttributes(gl, programInfo, info)
  }

  drawBufferInfo(gl, info, gl.TRIANGLES)
})

onBeforeUnmount(() => {
  gl.clear(gl.COLOR_BUFFER_BIT)
})
</script>

<script lang="ts">
export default {
  name: 'SelectionOverlay',
}
</script>
