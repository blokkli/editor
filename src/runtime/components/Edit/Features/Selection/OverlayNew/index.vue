<template>
  <Teleport to=".bk-main-canvas">
    <div />
  </Teleport>
</template>

<script lang="ts" setup>
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import type { DraggableExistingBlock, Rectangle } from '#blokkli/types'
import { useBlokkli, onBeforeUnmount, onMounted } from '#imports'
import {
  setBuffersAndAttributes,
  drawBufferInfo,
  type BufferInfo,
  setUniforms,
  setAttribInfoBufferFromArray,
} from 'twgl.js'
import vs from './vertex.glsl?raw'
import fs from './fragment.glsl?raw'
import { RectangleBufferCollector } from '#blokkli/helpers/webgl'
import { toShaderColor } from '#blokkli/helpers'
import useDebugLogger from '#blokkli/helpers/composables/useDebugLogger'

const props = defineProps<{
  blocks: DraggableExistingBlock[]
  uuids: string[]
}>()

const logger = useDebugLogger()

const { animation, theme, dom } = useBlokkli()

const gl = animation.gl()
const programInfo = animation.registerProgram('selection', gl, [vs, fs])

type SelectionRectangle = Rectangle & {
  id: string
  index: number
  isInverted: boolean
  radius: [number, number, number, number]
}

class SelectionRectangleBufferCollector extends RectangleBufferCollector<SelectionRectangle> {
  removed: string[] = []
  getBufferInfo(): BufferInfo {
    const uuids = dom.getVisibleBlocks()
    for (let i = 0; i < uuids.length; i++) {
      const uuid = uuids[i]
      const rect = dom.getBlockRect(uuid)
      if (!rect) {
        continue
      }
      this.added.add(uuid)
      const block = dom.findBlock(uuid)
      if (!block) {
        continue
      }
      const el = dom.getDragElement(block)
      const style =
        el instanceof HTMLElement ? theme.getDraggableStyle(el) : undefined
      this.addRectangle(
        {
          id: uuid,
          ...rect,
          radius: style?.radius || [0, 0, 0, 0],
          isInverted: false,
        },
        0,
      )
    }

    this.bufferInfo = this.createBufferInfo()

    return this.bufferInfo
  }

  remove(uuid: string) {
    this.removed.push(uuid)
  }
}

const collector = new SelectionRectangleBufferCollector(gl)
collector.getBufferInfo()

const uniforms = {
  u_color_default: toShaderColor(theme.accent.value[700]),
  u_color_inverted: [255, 255, 255],
}

onMounted(() => {
  gl.useProgram(programInfo.program)
  setUniforms(programInfo, uniforms)
  setBuffersAndAttributes(gl, programInfo, collector.bufferInfo!)
})

function updateState(index: number, state: number) {
  if (!collector.bufferInfo?.attribs?.a_state) {
    return
  }
  logger.log(`Updated index "${index}" with state "${state}"`)
  const newStateArray = new Float32Array([state, state, state, state])
  setAttribInfoBufferFromArray(
    gl,
    collector.bufferInfo.attribs.a_state,
    newStateArray,
    index * 16,
  )
}

/**
 * Update the position and quad attributes for the given index.
 */
function updatePosition(index: number, rect: Rectangle) {
  logger.log(
    `Updated index "${index}" with rectangle "${JSON.stringify(rect)}"`,
  )
  const x = rect.x
  const y = rect.y
  const width = rect.width
  const height = rect.height
  const newPosition = new Float32Array([
    x,
    y, // Lower left corner
    0,
    x + width,
    y, // Lower right corner
    1,
    x + width,
    y + height, // Upper right corner
    2,
    x,
    y + height, // Upper left corner
    3,
  ])
  const newQuad = new Float32Array([
    x,
    y,
    width,
    height,
    x,
    y,
    width,
    height,
    x,
    y,
    width,
    height,
    x,
    y,
    width,
    height,
  ])
  setAttribInfoBufferFromArray(
    gl,
    collector.bufferInfo!.attribs!.a_position,
    newPosition,
    index * 16 * 3,
  )
  setAttribInfoBufferFromArray(
    gl,
    collector.bufferInfo!.attribs!.a_quad,
    newQuad,
    index * 16 * 4,
  )
}

const currentActiveIndexes: Set<number> = new Set()

function rectanglesAreSame(a: Rectangle, b: Rectangle): boolean {
  return (
    Math.abs(a.height - b.height) < 3 &&
    Math.abs(a.width - b.width) < 3 &&
    Math.abs(a.x - b.x) < 3 &&
    Math.abs(a.y - b.y) < 3
  )
}

function updateChangedPositions() {
  const visible = dom.getVisibleBlocks()
  const hasBeenAdded: string[] = []

  for (let i = 0; i < visible.length; i++) {
    const uuid = visible[i]
    const newRect = dom.getBlockRect(uuid)
    if (!newRect) {
      continue
    }
    const currentRect = collector.rects[uuid]
    // Block was added.
    if (!currentRect) {
      currentActiveIndexes.clear()
      collector.reset()
      collector.getBufferInfo()
      setBuffersAndAttributes(gl, programInfo, collector.bufferInfo!)
      return
    }
    if (rectanglesAreSame(newRect, currentRect)) {
      continue
    }
    const index = collector.getIndex(uuid)
    if (index === undefined) {
      continue
    }

    updatePosition(index, newRect)
    collector.rects[uuid].width = newRect.width
    collector.rects[uuid].height = newRect.height
    collector.rects[uuid].x = newRect.x
    collector.rects[uuid].y = newRect.y
  }
}

/**
 * Update the state of the quads when the selection changes.
 */
function updateActiveIndexes(newUuids: string[]) {
  const newActiveIndexes = new Set()

  // Create the new set of active indexes, avoiding undefined values.
  for (const uuid of newUuids) {
    const index = collector.rects[uuid]?.index
    if (index !== undefined) {
      newActiveIndexes.add(index)
      if (!currentActiveIndexes.has(index)) {
        updateState(index, 1) // Activate this index
        currentActiveIndexes.add(index)
      }
    }
  }

  // Deactivate indexes that are no longer active.
  for (const index of currentActiveIndexes) {
    if (!newActiveIndexes.has(index)) {
      updateState(index, 0) // Deactivate this index
      currentActiveIndexes.delete(index)
    }
  }
}

onBlokkliEvent('canvas:draw', function (e) {
  animation.setSharedUniforms(gl, programInfo)
  const x = (e.mouseX - e.artboardOffset.x) / e.artboardScale
  const y = (e.mouseY - e.artboardOffset.y) / e.artboardScale
  setUniforms(programInfo, {
    u_mouse: [x, y],
  })

  updateActiveIndexes(props.uuids)
  updateChangedPositions()

  setBuffersAndAttributes(gl, programInfo, collector.bufferInfo!)
  drawBufferInfo(gl, collector.bufferInfo!, gl.TRIANGLES)
})

onBlokkliEvent('ui:resized', function () {
  collector.reset()
})
onBlokkliEvent('state:reloaded', function () {
  // const newUuids = Object.keys(dom.getBlockRects())
  // const existingUuids = Object.keys(collector.rects)
  // const removed = existingUuids.filter((uuid) => !newUuids.includes(uuid))
  // removed.forEach((uuid) => collector.remove(uuid))
  collector.reset()
  collector.getBufferInfo()
  setBuffersAndAttributes(gl, programInfo, collector.bufferInfo!)
})

onBeforeUnmount(function () {
  logger.log('SelectionOverlay unmounted')
  gl.clear(gl.COLOR_BUFFER_BIT)
})
</script>

<script lang="ts">
export default {
  name: 'SelectionOverlay',
}
</script>
