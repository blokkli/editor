<template>
  <div />
</template>

<script lang="ts" setup>
import { useBlokkli, computed } from '#imports'
import type {
  BufferInfo,
  TwglHelpers,
} from '#blokkli/editor/libraries/twgl'
import vs from './vertex.glsl?raw'
import fs from './fragment.glsl?raw'
import { RectangleBufferCollector } from '#blokkli/editor/helpers/webgl'
import { toShaderColor } from '#blokkli/editor/helpers/color'
import type { RGB } from './../../../../../global/types/theme'
import {
  defineRenderer,
  onBlokkliEvent,
  useTransitionedValue,
} from '#blokkli/editor/composables'
import type { Rectangle } from '#blokkli/editor/types/geometry'
import type { RenderedFieldListItem } from '#blokkli/editor/types/field'

const props = defineProps<{
  blocks: RenderedFieldListItem[]
  hasHostSelected: boolean
}>()

const { animation, theme, dom, ui, state, permissions } = useBlokkli()

type SelectionRectangle = Rectangle & {
  id: string
  index: number
  isInverted: boolean
  isFromLibrary: boolean
  isRestricted: boolean
  radius: [number, number, number, number]
}

class SelectionRectangleBufferCollector extends RectangleBufferCollector<SelectionRectangle> {
  uuids: string[] = []
  lastCount = 0
  prevKey = ''

  getBufferInfo(
    gl?: WebGLRenderingContext,
    twgl?: TwglHelpers,
    force?: boolean,
  ): {
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
            isRestricted: false,
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
        const isRestricted =
          !permissions.checkBlockBundlePermission(block.bundle, 'edit') ||
          !permissions.checkBlockBundlePermission(block.bundle, 'delete') ||
          !permissions.checkBlockBundlePermission(block.bundle, 'add')
        // Type: 0=default, 1=inverted, 2=library, 3=host, 4=restricted
        let type = 0
        if (isRestricted) {
          type = 4
        } else if (isFromLibrary) {
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
            isRestricted,
          },
          type,
        )
        this.lastCount++
      }

      this.prevKey = key
    }

    // Only update the buffer info if it has changed.
    if (hasChanged && gl && twgl) {
      this.bufferInfo = this.createBufferInfo(gl, twgl)
    }

    return { info: this.bufferInfo, hasChanged }
  }
}

const hasTransformingStyle = computed(
  () => ui.hasTransformOverlayOpen.value || ui.isTransforming.value,
)

const selectionColorOverride = computed<RGB | null>(() => {
  const color = ui.selectionColor.value
  if (!color) {
    return null
  }

  if (color === 'mono') {
    return theme.getColor(color, '500')
  } else if (color === 'accent') {
    return theme.getColor(color, '700')
  }

  return theme.getColor(color, 'normal')
})

const getColorDefault = useTransitionedValue(() => {
  if (selectionColorOverride.value) {
    return selectionColorOverride.value
  }
  if (hasTransformingStyle.value) {
    return theme.orange.value.normal
  }

  return theme.accent.value[600]
})

const getColorInverted = useTransitionedValue(() => {
  if (selectionColorOverride.value) {
    return selectionColorOverride.value
  }
  if (hasTransformingStyle.value) {
    return theme.orange.value.normal
  }

  return [255, 255, 255] as RGB
})

const getColorLibrary = useTransitionedValue(() => {
  if (selectionColorOverride.value) {
    return selectionColorOverride.value
  }
  if (hasTransformingStyle.value) {
    return theme.orange.value.normal
  }

  return theme.lime.value.normal
})

const getColorRestricted = useTransitionedValue(() => {
  if (selectionColorOverride.value) {
    return selectionColorOverride.value
  }
  if (hasTransformingStyle.value) {
    return theme.orange.value.normal
  }

  return theme.yellow.value.normal
})

const getColorHost = useTransitionedValue(() => {
  return theme.mono.value[700]
})

const getTransforming = useTransitionedValue(() => {
  return ui.isTransforming.value ? 1 : 0
})

// Register WebGL renderer with zIndex 100 (selection layer)
const { collector } = await defineRenderer('selection-overlay', {
  zIndex: 100,
  collector: () => new SelectionRectangleBufferCollector(),
  program: () => ({ shaders: [vs, fs] }),
  render: (ctx, gl, program, twgl) => {
    gl.useProgram(program.program)

    const { info } = collector.getBufferInfo(gl, twgl)

    // Nothing to draw.
    if (!info) {
      return
    }

    twgl.setUniforms(program, {
      u_color_default: toShaderColor(getColorDefault()),
      u_color_inverted: toShaderColor(getColorInverted()),
      u_color_library: toShaderColor(getColorLibrary()),
      u_color_restricted: toShaderColor(getColorRestricted()),
      u_color_host: toShaderColor(getColorHost()),
      u_artboard_size: [
        ui.artboardSize.value.width,
        ui.artboardSize.value.height,
      ],
      u_is_transforming: getTransforming(),
      u_opacity: ctx.changeOptionsTransition,
      u_time: ctx.time,
    })
    animation.setSharedUniforms(gl, program)

    twgl.setBuffersAndAttributes(gl, program, info)

    twgl.drawBufferInfo(gl, info, gl.TRIANGLES)
  },
  renderFallback: (ctx, ctx2d) => {
    // Call getBufferInfo to populate collector.rects (we don't need the WebGL buffer)
    collector.getBufferInfo()

    const rects = Object.values(collector.rects)

    // Nothing to draw.
    if (rects.length === 0) {
      return
    }

    // Apply global opacity
    ctx2d.globalAlpha = ctx.changeOptionsTransition

    // Helper to convert shader color to CSS rgba string
    const rgbaToCss = (rgb: RGB) => {
      return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`
    }

    const colorDefault = rgbaToCss(getColorDefault())
    const colorInverted = rgbaToCss(getColorInverted())
    const colorLibrary = rgbaToCss(getColorLibrary())
    const colorRestricted = rgbaToCss(getColorRestricted())
    const colorHost = rgbaToCss(getColorHost())

    // Calculate thickness based on scale (from vertex shader line 37)
    // float thickness = (0.5 + smoothstep(0.3, 1.0, u_scale) * 2.5) * u_dpi;
    const smoothstepValue = Math.max(
      0,
      Math.min(1, (ctx.artboardScale - 0.3) / 0.7),
    )
    const thickness = (0.5 + smoothstepValue * 2.5) * ctx.dpi

    // Draw all selection rectangles as strokes
    for (let i = 0; i < rects.length; i++) {
      const rect = rects[i]!

      // Map type to color (0=default, 1=inverted, 2=library, 3=host, 4=restricted)
      let strokeColor = colorDefault
      if (rect.isRestricted) {
        strokeColor = colorRestricted
      } else if (rect.isFromLibrary) {
        strokeColor = colorLibrary
      } else if (rect.isInverted) {
        strokeColor = colorInverted
      } else if (rect.id === 'host') {
        strokeColor = colorHost
      }

      ctx2d.strokeStyle = strokeColor
      ctx2d.lineWidth = thickness

      // Transform to viewport coordinates
      const viewportX =
        (rect.x * ctx.artboardScale + ctx.artboardOffset.x) * ctx.dpi
      const viewportY =
        (rect.y * ctx.artboardScale + ctx.artboardOffset.y) * ctx.dpi
      const viewportWidth = rect.width * ctx.artboardScale * ctx.dpi
      const viewportHeight = rect.height * ctx.artboardScale * ctx.dpi

      // Draw rounded rectangle border
      const maxRadius = Math.min(viewportWidth, viewportHeight) / 2
      const rtl = Math.min(
        rect.radius[0]! * ctx.artboardScale * ctx.dpi,
        maxRadius,
      )
      const rtr = Math.min(
        rect.radius[1]! * ctx.artboardScale * ctx.dpi,
        maxRadius,
      )
      const rbr = Math.min(
        rect.radius[2]! * ctx.artboardScale * ctx.dpi,
        maxRadius,
      )
      const rbl = Math.min(
        rect.radius[3]! * ctx.artboardScale * ctx.dpi,
        maxRadius,
      )

      ctx2d.beginPath()
      ctx2d.moveTo(viewportX + rtl, viewportY)
      ctx2d.lineTo(viewportX + viewportWidth - rtr, viewportY)
      if (rtr > 0) {
        ctx2d.arcTo(
          viewportX + viewportWidth,
          viewportY,
          viewportX + viewportWidth,
          viewportY + rtr,
          rtr,
        )
      }
      ctx2d.lineTo(viewportX + viewportWidth, viewportY + viewportHeight - rbr)
      if (rbr > 0) {
        ctx2d.arcTo(
          viewportX + viewportWidth,
          viewportY + viewportHeight,
          viewportX + viewportWidth - rbr,
          viewportY + viewportHeight,
          rbr,
        )
      }
      ctx2d.lineTo(viewportX + rbl, viewportY + viewportHeight)
      if (rbl > 0) {
        ctx2d.arcTo(
          viewportX,
          viewportY + viewportHeight,
          viewportX,
          viewportY + viewportHeight - rbl,
          rbl,
        )
      }
      ctx2d.lineTo(viewportX, viewportY + rtl)
      if (rtl > 0) {
        ctx2d.arcTo(viewportX, viewportY, viewportX + rtl, viewportY, rtl)
      }
      ctx2d.closePath()
      ctx2d.stroke()
    }

    // Reset global alpha
    ctx2d.globalAlpha = 1
  },
})

onBlokkliEvent('ui:resized', function () {
  collector.reset()
  collector.prevKey = ''
})

onBlokkliEvent('state:reloaded', function () {
  collector.reset()
  collector.prevKey = ''
})
</script>

<script lang="ts">
export default {
  name: 'SelectionOverlay',
}
</script>
