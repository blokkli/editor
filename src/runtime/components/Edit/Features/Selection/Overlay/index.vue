<template>
  <div />
</template>

<script lang="ts" setup>
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import defineRenderer from '#blokkli/helpers/composables/defineRenderer'
import type { DraggableExistingBlock, Rectangle } from '#blokkli/types'
import { useBlokkli, computed } from '#imports'
import {
  setBuffersAndAttributes,
  drawBufferInfo,
  type BufferInfo,
  setUniforms,
} from 'twgl.js'
import vs from './vertex.glsl?raw'
import fs from './fragment.glsl?raw'
import { RectangleBufferCollector } from '#blokkli/helpers/webgl'
import { useTransitionedValue } from '#blokkli/helpers/useTransitionedValue'
import { toShaderColor } from '#blokkli/helpers'
import type { RGB } from '#blokkli/types/theme'

const props = defineProps<{
  blocks: DraggableExistingBlock[]
  gl: WebGLRenderingContext
  hasHostSelected: boolean
}>()

const { animation, theme, dom, ui, state } = useBlokkli()

const programInfo = animation.registerProgram('selection', props.gl, [vs, fs])

type SelectionRectangle = Rectangle & {
  id: string
  index: number
  isInverted: boolean
  isFromLibrary: boolean
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
    const key =
      props.blocks
        .map((block) => {
          const uuid = block.uuid
          const rect = dom.getBlockRect(uuid)
          if (!rect) {
            return uuid + 'no_rect'
          }

          return uuid + rect.time
        })
        .join('_') +
      '_host_' +
      props.hasHostSelected

    const hasChanged = force || this.prevKey !== key
    if (hasChanged) {
      this.reset()
      this.lastCount = 0

      // Add host selection rectangle if the page is selected
      if (props.hasHostSelected) {
        this.addRectangle(
          {
            id: 'host',
            height: ui.artboardSize.value.height,
            width: ui.artboardSize.value.width,
            x: 0,
            y: 0,
            radius: [0, 0, 0, 0],
            isInverted: false,
            isFromLibrary: false,
          },
          3, // Type 3 = host selection
        )
        this.lastCount++
      }

      for (let i = 0; i < props.blocks.length; i++) {
        const block = props.blocks[i]!
        if (this.added.has(block.uuid)) {
          continue
        }
        this.added.add(block.uuid)
        const el = dom.getDragElement(block)
        const rect = dom.getBlockRect(block.uuid)
        if (!rect || !el) {
          continue
        }
        const style = ui.lowPerformanceMode.value
          ? null
          : theme.getDraggableStyle(el)
        const isFromLibrary = state.fromLibraryUuids.value.includes(block.uuid)
        // Type: 0=default, 1=inverted, 2=library, 3=host
        let type = 0
        if (isFromLibrary) {
          type = 2
        } else if (style?.isInverted) {
          type = 1
        }
        this.addRectangle(
          {
            id: block.uuid,
            height: rect.height,
            width: rect.width,
            x: rect.x,
            y: rect.y,
            radius: style?.radius ?? [0, 0, 0, 0],
            isInverted: !!style?.isInverted,
            isFromLibrary,
          },
          type,
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

const hasTransformingStyle = computed(
  () => ui.hasTransformOverlayOpen.value || ui.isTransforming.value,
)

const selectionColorOverride = computed<RGB | null>(() => {
  const color = ui.selectionColor.value
  if (!color) {
    return null
  }

  if (color === 'mono') {
    return toShaderColor(theme.getColor(color, '500'))
  } else if (color === 'accent') {
    return toShaderColor(theme.getColor(color, '700'))
  }

  return toShaderColor(theme.getColor(color, 'normal'))
})

const getColorDefault = useTransitionedValue(() => {
  if (selectionColorOverride.value) {
    return selectionColorOverride.value
  }
  if (hasTransformingStyle.value) {
    return toShaderColor(theme.orange.value.normal)
  }

  return toShaderColor(theme.accent.value[600])
})

const getColorInverted = useTransitionedValue(() => {
  if (selectionColorOverride.value) {
    return selectionColorOverride.value
  }
  if (hasTransformingStyle.value) {
    return toShaderColor(theme.orange.value.normal)
  }

  return toShaderColor([255, 255, 255])
})

const getColorLibrary = useTransitionedValue(() => {
  if (selectionColorOverride.value) {
    return selectionColorOverride.value
  }
  if (hasTransformingStyle.value) {
    return toShaderColor(theme.orange.value.normal)
  }

  return toShaderColor(theme.lime.value.normal)
})

const getColorHost = useTransitionedValue(() => {
  return toShaderColor(theme.mono.value[700])
})

const getTransforming = useTransitionedValue(() => {
  return ui.isTransforming.value ? 1 : 0
})

// Register WebGL renderer with zIndex 100 (selection layer)
defineRenderer('selection-overlay', {
  zIndex: 100,
  render: (ctx) => {
    props.gl.useProgram(programInfo.program)

    const { info } = collector.getBufferInfo()

    // Nothing to draw.
    if (!info) {
      return
    }

    setUniforms(programInfo, {
      u_color_default: getColorDefault(),
      u_color_inverted: getColorInverted(),
      u_color_library: getColorLibrary(),
      u_color_host: getColorHost(),
      u_artboard_size: [
        ui.artboardSize.value.width,
        ui.artboardSize.value.height,
      ],
      u_is_transforming: getTransforming(),
      u_time: ctx.time,
    })
    animation.setSharedUniforms(props.gl, programInfo)

    setBuffersAndAttributes(props.gl, programInfo, info)

    drawBufferInfo(props.gl, info, props.gl.TRIANGLES)
  },
})

onBlokkliEvent('ui:resized', function () {
  collector.reset()
})

onBlokkliEvent('state:reloaded', function () {
  collector.reset()
})
</script>

<script lang="ts">
export default {
  name: 'SelectionOverlay',
}
</script>
