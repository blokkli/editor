<template>
  <Teleport to="body">
    <div />
  </Teleport>
</template>

<script lang="ts" setup>
import { useBlokkli, onBeforeUnmount } from '#imports'
import { intersects, toShaderColor } from '#blokkli/helpers'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import vs from './vertex.glsl?raw'
import fs from './fragment.glsl?raw'
import {
  type BufferInfo,
  setBuffersAndAttributes,
  drawBufferInfo,
  setUniforms,
} from 'twgl.js'
import type { Coord, Rectangle } from '#blokkli/types'
import { RectangleBufferCollector } from '#blokkli/helpers/webgl'
import useDebugLogger from '#blokkli/helpers/composables/useDebugLogger'

const { eventBus, dom, theme, animation, ui } = useBlokkli()
const logger = useDebugLogger()

const props = defineProps<{
  startX: number
  startY: number
  isPressingControl: boolean
  gl: WebGLRenderingContext
}>()

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
    offset: Coord,
    scale: number,
  ): { info: BufferInfo | null; hasChanged: boolean } {
    const visibleBlocks = dom.getVisibleBlocks()

    const lengthBefore = this.positions.length

    for (let i = 0; i < visibleBlocks.length; i++) {
      const uuid = visibleBlocks[i]
      if (this.added.has(uuid)) {
        continue
      }
      const block = dom.findBlock(uuid)
      if (!block) {
        continue
      }
      const el = dom.getDragElement(block)
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
    if (hasChanged) {
      this.bufferInfo = this.createBufferInfo()
    }

    return { info: this.bufferInfo, hasChanged }
  }

  getSelectedUuids(box: Rectangle): { nested: string[]; notNested: string[] } {
    const nested: string[] = []
    const notNested: string[] = []
    const rects = Object.values(this.rects)

    for (let i = 0; i < rects.length; i++) {
      const rect = rects[i]
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
      const rect = rects[i]
      if (intersects(box, rect) && rect.isNested) {
        return true
      }
    }
    return false
  }
}

const collector = new MultiSelectRectangleBufferCollector(props.gl)
const thick = 100
collector.addRectangle(
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
collector.addRectangle(
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
collector.addRectangle(
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
collector.addRectangle(
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

const artboardOffsetStart = { ...ui.artboardOffset.value }
const artboardScaleStart = ui.artboardScale.value

const programInfo = animation.registerProgram(
  'multi_select_overlay',
  props.gl,
  [vs, fs],
)
const uniforms = {
  u_color_field_active: toShaderColor(theme.accent.value[700]),
  u_color_field_default: toShaderColor(theme.mono.value[400]),
  u_color_area_active: toShaderColor(theme.teal.value.normal),
  u_color_area_default: toShaderColor(theme.teal.value.normal),
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

const now = Date.now()

onBlokkliEvent('canvas:draw', (e) => {
  mouseX = e.mouseX
  mouseY = e.mouseY

  const { shader, check } = getSelectRect(e.artboardOffset, e.artboardScale)

  const { nested } = collector.getSelectedUuids(check)
  const shouldSelectAll = props.isPressingControl || !nested.length

  props.gl.useProgram(programInfo.program)

  const time = (Date.now() - now) / 1000

  setUniforms(programInfo, uniforms)
  setUniforms(programInfo, {
    u_select_all: shouldSelectAll ? 1 : 0,
    u_select_rect: [shader.x, shader.y, shader.width, shader.height],
    u_time: time,
  })

  animation.setSharedUniforms(props.gl, programInfo)
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
    setBuffersAndAttributes(props.gl, programInfo, info)
  }

  drawBufferInfo(props.gl, info, props.gl.TRIANGLES)
})

onBeforeUnmount(() => {
  props.gl.clear(props.gl.COLOR_BUFFER_BIT)

  const { check } = getSelectRect(
    ui.artboardOffset.value,
    ui.artboardScale.value,
  )

  const { nested, notNested } = collector.getSelectedUuids(check)
  if (props.isPressingControl) {
    eventBus.emit('select:end', [...nested, ...notNested])
  } else if (!nested.length) {
    eventBus.emit('select:end', notNested)
  } else {
    eventBus.emit('select:end', nested)
  }

  logger.log('MultiSelectOverlay unmounted')
})
</script>
