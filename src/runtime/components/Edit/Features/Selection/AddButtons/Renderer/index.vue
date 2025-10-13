<template>
  <div />
</template>

<script lang="ts" setup>
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import defineRenderer from '#blokkli/helpers/composables/defineRenderer'
import { useBlokkli, computed, ref } from '#imports'
import { setBuffersAndAttributes, drawBufferInfo, setUniforms } from 'twgl.js'
import vs from './vertex.glsl?raw'
import fs from './fragment.glsl?raw'
import { RectangleBufferCollector } from '#blokkli/helpers/webgl'
import type { Rectangle } from '#blokkli/types'
import { toShaderColor } from '#blokkli/helpers'
import {
  getChildrenOrientation,
  type Orientation,
} from '#blokkli/helpers/dropTargets'

const props = defineProps<{
  emptyFieldKeys?: string[]
  canShowBeforeAfter?: boolean
}>()

const { animation, theme, dom, selection } = useBlokkli()

const emit = defineEmits<{
  (
    e: 'toggle',
    data: { position: 'before' | 'after'; coordinates: { x: number; y: number } },
  ): void
  (
    e: 'toggleField',
    data: { index: number; coordinates: { x: number; y: number } },
  ): void
}>()

// Get WebGL context
const gl = animation.gl()

const programInfo = gl
  ? animation.registerProgram('add-buttons', gl, [vs, fs])
  : null

// Total number of circles we support (2 for before/after + 8 for empty fields)
const MAX_CIRCLES = 10

type CircleRectangle = Rectangle & {
  id: string
  index: number
}

let bufferInfo: ReturnType<
  RectangleBufferCollector<CircleRectangle>['createBufferInfo']
> | null = null

if (gl) {
  class CircleBufferCollector extends RectangleBufferCollector<CircleRectangle> {}
  const collector = new CircleBufferCollector(gl)

  // Add MAX_CIRCLES dummy rectangles once
  for (let i = 0; i < MAX_CIRCLES; i++) {
    collector.addRectangle(
      {
        id: `circle-${i}`,
        x: 0,
        y: 0,
        width: 40,
        height: 40,
      },
      i,
    )
  }
  bufferInfo = collector.createBufferInfo()
}

// Circle state
const circlePositions = new Float32Array(MAX_CIRCLES * 2) // x, y for each circle
const circleVisible = new Float32Array(MAX_CIRCLES) // visibility for each circle

// Track which circle is being hovered (-1 for none)
const hoveredCircle = ref<number>(-1)

const color = computed(() => {
  return toShaderColor(theme.accent.value[600])
})

const colorHover = computed(() => {
  return toShaderColor(theme.accent.value[500])
})

// Cache orientation per UUID for performance
const orientationCache = new Map<string, Orientation>()
const currentOrientation = ref<Orientation>('horizontal')

function getOrientationForUuid(uuid: string): Orientation {
  let cached = orientationCache.get(uuid)
  if (!cached) {
    const block = dom.findBlock(uuid)
    if (block) {
      const field = dom.findField(block.hostUuid, block.hostFieldName)
      if (field) {
        cached = getChildrenOrientation(field.element)
        orientationCache.set(uuid, cached)
      }
    }
  }
  return cached || 'horizontal'
}

// Clear cache when state reloads
onBlokkliEvent('state:reloaded', () => {
  orientationCache.clear()
})

/**
 * Check if a point (in artboard coordinates) is inside any visible circle.
 * Returns the circle index if found, -1 otherwise.
 */
function getCircleAtPoint(x: number, y: number): number {
  const radius = 20
  for (let i = 0; i < MAX_CIRCLES; i++) {
    if (circleVisible[i]! > 0) {
      const cx = circlePositions[i * 2]!
      const cy = circlePositions[i * 2 + 1]!
      const dx = x - cx
      const dy = y - cy
      const distance = Math.sqrt(dx * dx + dy * dy)
      if (distance <= radius) {
        return i
      }
    }
  }
  return -1
}

// Register WebGL renderer with zIndex 350 (interaction layer)
if (gl && programInfo && bufferInfo) {
  defineRenderer('add-buttons', {
    zIndex: 1000,
    enabled: () => selection.uuids.value.length === 1,
    cursor: () => (hoveredCircle.value >= 0 ? 'pointer' : null),
    onClick: ({ mouseArtboard }) => {
      // Only handle clicks if exactly one block is selected
      if (selection.uuids.value.length !== 1) {
        return false
      }

      const clickedCircle = getCircleAtPoint(mouseArtboard.x, mouseArtboard.y)
      if (clickedCircle >= 0) {
        // Get the circle center coordinates
        const cx = circlePositions[clickedCircle * 2]!
        const cy = circlePositions[clickedCircle * 2 + 1]!

        if (clickedCircle === 0 || clickedCircle === 1) {
          // Circle 0 is "before", circle 1 is "after"
          const position = clickedCircle === 0 ? 'before' : 'after'
          emit('toggle', {
            position,
            coordinates: { x: cx, y: cy },
          })
        } else {
          // Circles 2-9 are empty field buttons
          const fieldIndex = clickedCircle - 2
          emit('toggleField', {
            index: fieldIndex,
            coordinates: { x: cx, y: cy },
          })
        }
        return true
      }

      return false
    },
    render: (ctx) => {
      // Reset all circles to invisible
      circleVisible.fill(0)

      // Check if exactly one block is selected and can show before/after buttons
      if (selection.uuids.value.length === 1 && props.canShowBeforeAfter) {
        const uuid = selection.uuids.value[0]
        if (!uuid) {
          return
        }

        const blockRect = dom.getBlockRect(uuid)
        if (!blockRect || blockRect.width === 0) {
          return
        }

        // Get cached orientation
        const orientation = getOrientationForUuid(uuid)
        currentOrientation.value = orientation

        if (orientation === 'horizontal') {
          // Horizontal layout: buttons at left and right edges
          // Circle 0: Left edge center
          circlePositions[0] = blockRect.x // x
          circlePositions[1] = blockRect.y + blockRect.height / 2 // y
          circleVisible[0] = 1

          // Circle 1: Right edge center
          circlePositions[2] = blockRect.x + blockRect.width // x
          circlePositions[3] = blockRect.y + blockRect.height / 2 // y
          circleVisible[1] = 1
        } else {
          // Vertical layout: buttons at top and bottom edges
          // Circle 0: Top edge center
          circlePositions[0] = blockRect.x + blockRect.width / 2 // x
          circlePositions[1] = blockRect.y // y
          circleVisible[0] = 1

          // Circle 1: Bottom edge center
          circlePositions[2] = blockRect.x + blockRect.width / 2 // x
          circlePositions[3] = blockRect.y + blockRect.height // y
          circleVisible[1] = 1
        }

      }

      // Render empty field buttons (circles 2-9)
      // These are independent of canShowBeforeAfter
      if (
        selection.uuids.value.length === 1 &&
        props.emptyFieldKeys &&
        props.emptyFieldKeys.length > 0
      ) {
        for (let i = 0; i < props.emptyFieldKeys.length && i < 8; i++) {
          const fieldKey = props.emptyFieldKeys[i]
          if (!fieldKey) {
            continue
          }

          const fieldRect = dom.getFieldRect(fieldKey)
          if (!fieldRect) {
            continue
          }

          // Position at center of field
          const circleIndex = i + 2 // Start from circle 2
          circlePositions[circleIndex * 2] = fieldRect.x + fieldRect.width / 2 // x
          circlePositions[circleIndex * 2 + 1] =
            fieldRect.y + fieldRect.height / 2 // y
          circleVisible[circleIndex] = 1
        }
      }

      // Check if mouse is hovering over any visible circle
      hoveredCircle.value = getCircleAtPoint(
        ctx.mouseArtboard.x,
        ctx.mouseArtboard.y,
      )

      gl.useProgram(programInfo.program)

      setUniforms(programInfo, {
        u_circle_positions: circlePositions,
        u_circle_visible: circleVisible,
        u_color: color.value,
        u_color_hover: colorHover.value,
        u_hovered_circle: hoveredCircle.value,
      })
      animation.setSharedUniforms(gl, programInfo)

      setBuffersAndAttributes(gl, programInfo, bufferInfo)
      drawBufferInfo(gl, bufferInfo, gl.TRIANGLES)
    },
  })
}
</script>

<script lang="ts">
export default {
  name: 'AddButtonsRenderer',
}
</script>
