<template>
  <div />
</template>

<script lang="ts" setup>
import { useBlokkli, onBeforeUnmount } from '#imports'
import { intersects } from '#blokkli/editor/helpers/geometry'
import { toShaderColor } from '#blokkli/editor/helpers/color'
import vs from './vertex.glsl?raw'
import fs from './fragment.glsl?raw'
import type {
  BufferInfo,
  TwglHelpers,
} from '#blokkli/editor/libraries/twgl'
import { RectangleBufferCollector } from '#blokkli/editor/helpers/webgl'
import { defineRenderer, useDebugLogger } from '#blokkli/editor/composables'
import type { Coord, Rectangle } from '#blokkli/editor/types/geometry'

const { eventBus, dom, theme, animation, ui, blocks, permissions } =
  useBlokkli()
const logger = useDebugLogger()

const props = defineProps<{
  startX: number
  startY: number
  isPressingControl: boolean
}>()

const startTimestamp = Date.now()

defineEmits<{
  (e: 'select', uuids: string[]): void
}>()

type MultiSelectRectangle = Rectangle & {
  id: string
  index: number
  isNested: boolean
  radius: [number, number, number, number]
}

class MultiSelectRectangleBufferCollector extends RectangleBufferCollector<MultiSelectRectangle> {
  getBufferInfo(
    gl?: WebGLRenderingContext,
    twgl?: TwglHelpers,
    offset?: Coord,
    scale?: number,
  ): { info: BufferInfo | null; hasChanged: boolean } {
    if (!offset || !scale) {
      return { info: this.bufferInfo, hasChanged: false }
    }

    const visibleBlocks = dom.getVisibleBlocks()

    const lengthBefore = this.positions.length

    for (let i = 0; i < visibleBlocks.length; i++) {
      const uuid = visibleBlocks[i]
      if (!uuid) {
        continue
      }

      if (this.added.has(uuid)) {
        continue
      }
      const block = blocks.getBlock(uuid)
      if (!block) {
        continue
      }
      if (permissions.blockHasRestrictedAncestor(uuid)) {
        continue
      }
      const el = dom.getDragElement(block)
      if (!el) {
        continue
      }
      const rect = el.getBoundingClientRect()
      const style = theme.getDraggableStyle(el)
      this.addRectangle(
        {
          id: uuid,
          x: rect.x / scale - offset.x / scale,
          y: rect.y / scale - offset.y / scale,
          width: rect.width / scale,
          height: rect.height / scale,
          isNested: block.isNested,
          radius: style.radius,
        },
        block.isNested ? 6 : 5,
      )
    }

    const hasChanged = lengthBefore !== this.positions.length

    // Only update the buffer info if it has changed.
    if (hasChanged && gl && twgl) {
      this.bufferInfo = this.createBufferInfo(gl, twgl)
    }

    return { info: this.bufferInfo, hasChanged }
  }

  getSelectedUuids(box: Rectangle): { nested: string[]; notNested: string[] } {
    const nested: string[] = []
    const notNested: string[] = []
    const rects = Object.values(this.rects)

    for (let i = 0; i < rects.length; i++) {
      const rect = rects[i]!
      if (intersects(box, rect)) {
        if (rect.isNested) {
          nested.push(rect.id)
        } else {
          notNested.push(rect.id)
        }
      }
    }

    return { nested, notNested }
  }

  isSelectingNested(box: Rectangle): boolean {
    const rects = Object.values(this.rects)
    for (let i = 0; i < rects.length; i++) {
      const rect = rects[i]!
      if (intersects(box, rect) && rect.isNested) {
        return true
      }
    }
    return false
  }
}

const artboardOffsetStart = { ...ui.artboardOffset.value }
const artboardScaleStart = ui.artboardScale.value

const uniforms = {
  u_color_field_active: theme.accent.value[700],
  u_color_field_default: theme.mono.value[400],
}

let mouseX = 0
let mouseY = 0

function getSelectRect(
  offset: Coord,
  scale: number,
): { shader: Rectangle; check: Rectangle } {
  const startX =
    (props.startX / artboardScaleStart +
      (offset.x / scale - artboardOffsetStart.x / artboardScaleStart)) *
    scale

  const startY =
    (props.startY / artboardScaleStart +
      (offset.y / scale - artboardOffsetStart.y / artboardScaleStart)) *
    scale

  const ax = startX > mouseX ? mouseX : startX
  const ay = startY > mouseY ? mouseY : startY
  const bx = startX > mouseX ? startX : mouseX
  const by = startY > mouseY ? startY : mouseY
  const shader = {
    x: ax,
    y: ay,
    width: bx - ax,
    height: by - ay,
  }
  const check = {
    x: shader.x / scale - offset.x / scale,
    y: shader.y / scale - offset.y / scale,
    width: shader.width / scale,
    height: shader.height / scale,
  }

  return { shader, check }
}

// Register WebGL renderer with zIndex 450 (multi-select layer)
// Set "only" to true so that when multi-selecting, only the selection box is rendered
const { collector } = await defineRenderer('multiselect-overlay', {
  zIndex: 450,
  only: true,
  collector: () => {
    const c = new MultiSelectRectangleBufferCollector()
    const thick = 300
    // Add selection box border rectangles
    c.addRectangle(
      {
        width: 1000,
        height: thick,
        x: 100,
        y: 100,
        id: 'select-rect-top',
        isNested: false,
        radius: [0, 0, 0, 0],
      },
      0,
    )
    c.addRectangle(
      {
        width: thick,
        height: 1000,
        x: 1000 + thick,
        y: thick,
        id: 'select-rect-right',
        isNested: false,
        radius: [0, 0, 0, 0],
      },
      0,
    )
    c.addRectangle(
      {
        width: 1000,
        height: thick,
        x: 100 + thick,
        y: 1000 + thick,
        id: 'select-rect-bottom',
        isNested: false,
        radius: [0, 0, 0, 0],
      },
      0,
    )
    c.addRectangle(
      {
        width: thick,
        height: 1000,
        x: 100,
        y: 100 + thick,
        id: 'select-rect-left',
        isNested: false,
        radius: [0, 0, 0, 0],
      },
      0,
    )
    return c
  },
  program: () => ({ shaders: [vs, fs] }),
  cursor: () => 'crosshair',
  render: (ctx, gl, program, twgl) => {
    mouseX = ctx.mouseX
    mouseY = ctx.mouseY

    const { shader, check } = getSelectRect(
      ctx.artboardOffset,
      ctx.artboardScale,
    )

    const { nested } = collector.getSelectedUuids(check)
    const shouldSelectAll = props.isPressingControl || !nested.length

    gl.useProgram(program.program)

    const time = (Date.now() - startTimestamp) / 1000

    twgl.setUniforms(program, {
      u_color_field_active: toShaderColor(uniforms.u_color_field_active),
      u_color_field_default: toShaderColor(uniforms.u_color_field_default),
    })
    twgl.setUniforms(program, {
      u_select_all: shouldSelectAll ? 1 : 0,
      u_select_rect: [shader.x, shader.y, shader.width, shader.height],
      u_time: time,
    })

    animation.setSharedUniforms(gl, program)
    const { info, hasChanged } = collector.getBufferInfo(
      gl,
      twgl,
      ctx.artboardOffset,
      ctx.artboardScale,
    )

    // Nothing to draw.
    if (!info) {
      return
    }

    // Only update buffer and attributes when they have changed.
    if (hasChanged) {
      twgl.setBuffersAndAttributes(gl, program, info)
    }

    twgl.drawBufferInfo(gl, info, gl.TRIANGLES)
  },
  renderFallback: (ctx, ctx2d) => {
    mouseX = ctx.mouseX
    mouseY = ctx.mouseY

    const { shader, check } = getSelectRect(
      ctx.artboardOffset,
      ctx.artboardScale,
    )

    const { nested } = collector.getSelectedUuids(check)
    const shouldSelectAll = props.isPressingControl || !nested.length

    // Get buffer info to populate collector.rects
    collector.getBufferInfo(
      undefined,
      undefined,
      ctx.artboardOffset,
      ctx.artboardScale,
    )

    const rects = Object.values(collector.rects)

    // 1. Draw intersecting blocks with field_active color (from shader: v_color_active)
    const colorFieldActive = `rgba(${uniforms.u_color_field_active[0]}, ${uniforms.u_color_field_active[1]}, ${uniforms.u_color_field_active[2]}, 0.3)`

    for (let i = 0; i < rects.length; i++) {
      const rect = rects[i]!

      // Skip selection box border rectangles (type 0)
      if (rect.id.startsWith('select-rect-')) {
        continue
      }

      // Only draw rectangles that intersect with the selection box
      if (!intersects(rect, check)) {
        continue
      }

      // Match shader logic: only highlight if (is_nested || select_all)
      if (!rect.isNested && !shouldSelectAll) {
        continue
      }

      // All intersecting blocks use the same active color (v_color_active from shader)
      ctx2d.fillStyle = colorFieldActive
      ctx2d.fillRect(
        (rect.x * ctx.artboardScale + ctx.artboardOffset.x) * ctx.dpi,
        (rect.y * ctx.artboardScale + ctx.artboardOffset.y) * ctx.dpi,
        rect.width * ctx.artboardScale * ctx.dpi,
        rect.height * ctx.artboardScale * ctx.dpi,
      )
    }

    // 2. Draw marching ants selection border (black/white animated dashes)
    const time = (Date.now() - startTimestamp) / 1000
    const speed = 100 * ctx.dpi
    const dashLength = 8 * ctx.dpi
    const phase = time * speed * -1

    // Set up dashed line with animation
    ctx2d.lineWidth = 2 * ctx.dpi
    ctx2d.setLineDash([dashLength, dashLength])

    // Draw white dashes
    ctx2d.strokeStyle = 'rgba(255, 255, 255, 0.8)'
    ctx2d.lineDashOffset = phase % (dashLength * 2)
    ctx2d.strokeRect(
      shader.x * ctx.dpi,
      shader.y * ctx.dpi,
      shader.width * ctx.dpi,
      shader.height * ctx.dpi,
    )

    // Draw black dashes (offset by half the pattern for alternating effect)
    ctx2d.strokeStyle = 'rgba(0, 0, 0, 0.8)'
    ctx2d.lineDashOffset = (phase + dashLength) % (dashLength * 2)
    ctx2d.strokeRect(
      shader.x * ctx.dpi,
      shader.y * ctx.dpi,
      shader.width * ctx.dpi,
      shader.height * ctx.dpi,
    )

    // Reset line dash
    ctx2d.setLineDash([])
  },
})

function getUuidsToSelect(): string[] {
  const { check } = getSelectRect(
    ui.artboardOffset.value,
    ui.artboardScale.value,
  )

  const { nested, notNested } = collector.getSelectedUuids(check)
  if (props.isPressingControl) {
    return [...nested, ...notNested]
  } else if (!nested.length) {
    return notNested
  }
  return nested
}

onBeforeUnmount(() => {
  const diff = Date.now() - startTimestamp

  // Only select if the entire duration of the interaction is above a certain threshold.
  // This prevents the unwanted selection of blocks when the user attempts to select a single block, but ends up starting multi selecting.
  if (diff > 175) {
    eventBus.emit('select:end', getUuidsToSelect())
  } else {
    eventBus.emit('select:end')
  }

  logger.log('MultiSelectOverlay unmounted')
})
</script>
