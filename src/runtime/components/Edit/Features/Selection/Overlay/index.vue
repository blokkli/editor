<template>
  <div />
</template>

<script lang="ts" setup>
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import type { DraggableExistingBlock, Rectangle } from '#blokkli/types'
import { useBlokkli, onBeforeUnmount } from '#imports'
import {
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
  gl: WebGLRenderingContext
}>()

const { animation, theme, dom } = useBlokkli()

const programInfo = animation.registerProgram('selection', props.gl, [vs, fs])

type SelectionRectangle = Rectangle & {
  id: string
  index: number
  isInverted: boolean
  radius: [number, number, number, number]
}

class SelectionRectangleBufferCollector extends RectangleBufferCollector<SelectionRectangle> {
  uuids: string[] = []
  lastCount = 0
  prevKey = ''

  getBufferInfo(force?: boolean): {
    info: BufferInfo | null
    hasChanged: boolean
  } {
    const key = props.blocks
      .map((block) => {
        const uuid = block.uuid
        const rect = dom.getBlockRect(uuid)
        if (!rect) {
          return uuid + 'no_rect'
        }

        return uuid + rect.time
      })
      .join('_')

    const hasChanged = force || this.prevKey !== key
    if (hasChanged) {
      this.reset()
      this.lastCount = 0
      for (let i = 0; i < props.blocks.length; i++) {
        const block = props.blocks[i]
        if (this.added.has(block.uuid)) {
          continue
        }
        this.added.add(block.uuid)
        const el = dom.getDragElement(block)
        const rect = dom.getBlockRect(block.uuid)
        if (!rect || !el) {
          continue
        }
        const style = theme.getDraggableStyle(el)
        this.addRectangle(
          {
            id: block.uuid,
            height: rect.height,
            width: rect.width,
            x: rect.x,
            y: rect.y,
            radius: style.radius,
            isInverted: style.isInverted,
          },
          style.isInverted ? 1 : 0,
        )
        this.lastCount++
      }

      this.prevKey = key
    }

    // Only update the buffer info if it has changed.
    if (hasChanged) {
      this.bufferInfo = this.createBufferInfo()
    }

    return { info: this.bufferInfo, hasChanged }
  }
}

const collector = new SelectionRectangleBufferCollector(props.gl)

const uniforms = {
  u_color_default: toShaderColor(theme.accent.value[600]),
  u_color_inverted: [255, 255, 255],
}

onBlokkliEvent('canvas:draw', () => {
  props.gl.useProgram(programInfo.program)

  setUniforms(programInfo, uniforms)
  animation.setSharedUniforms(props.gl, programInfo)
  const { info, hasChanged } = collector.getBufferInfo()

  // Nothing to draw.
  if (!info) {
    return
  }

  // Only update buffer and attributes when they have changed.
  if (hasChanged) {
    setBuffersAndAttributes(props.gl, programInfo, info)
  }

  drawBufferInfo(props.gl, info, props.gl.TRIANGLES)
})

onBlokkliEvent('ui:resized', function () {
  collector.reset()
})

onBlokkliEvent('state:reloaded', function () {
  collector.reset()
})

onBeforeUnmount(() => {
  props.gl.clear(props.gl.COLOR_BUFFER_BIT)
})
</script>

<script lang="ts">
export default {
  name: 'SelectionOverlay',
}
</script>
