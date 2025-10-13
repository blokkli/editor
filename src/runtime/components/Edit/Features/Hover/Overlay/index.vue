<template>
  <div />
</template>

<script lang="ts" setup>
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import defineRenderer from '#blokkli/helpers/composables/defineRenderer'
import type { Rectangle } from '#blokkli/types'
import { useBlokkli, computed, ref } from '#imports'
import { setBuffersAndAttributes, drawBufferInfo, setUniforms } from 'twgl.js'
import vs from './vertex.glsl?raw'
import fs from './fragment.glsl?raw'
import { RectangleBufferCollector } from '#blokkli/helpers/webgl'
import { toShaderColor, isInsideRect } from '#blokkli/helpers'

const props = defineProps<{
  gl: WebGLRenderingContext
}>()

const { animation, theme, dom, selection, state, ui, editable } = useBlokkli()

const programInfo = animation.registerProgram('hover', props.gl, [vs, fs])

// Debug mode: disable caching of previous state to always recalculate.
const DEBUG = false

// How many hover quads are supported.
// This means that we support 10 blocks + 1 editable field.
// Which means that there can only ever be 10 hover blocks visible,
// so a max. nesting level of 10 (which should be more than enough).
const MAX_RECTS = 11

type HoverRectangle = Rectangle & {
  id: string
  index: number
  radius: [number, number, number, number]
}

type HoverState = {
  // Rect 0-9: Hover rectangles by nesting level
  // Rect 10: Editable field
  positions: Float32Array // 11 vec4s = 44 floats (x, y, width, height)
  radii: Float32Array // 11 vec4s = 44 floats (topLeft, topRight, bottomRight, bottomLeft)
  types: Float32Array // 11 floats (0=mono, 1=accent, 2=teal fill)
  visible: Float32Array // 11 floats (0=hidden, 1=visible)
}

/**
 * Determine which UUID is the "deepest" in the hierarchy.
 * Returns the block with the highest nesting level.
 */
function getDeepestUuid(uuids: string[]): string | null {
  if (uuids.length === 0) {
    return null
  }

  let deepestUuid = uuids[0]!
  let maxLevel = state.getNestingLevel(deepestUuid)

  for (let i = 1; i < uuids.length; i++) {
    const uuid = uuids[i]!
    const level = state.getNestingLevel(uuid)
    if (level > maxLevel) {
      maxLevel = level
      deepestUuid = uuid
    }
  }

  return deepestUuid
}

function createHoverState(): HoverState {
  return {
    positions: new Float32Array(MAX_RECTS * 4),
    radii: new Float32Array(MAX_RECTS * 4),
    types: new Float32Array(MAX_RECTS),
    visible: new Float32Array(MAX_RECTS),
  }
}

const hoverState = createHoverState()

// Track previous frame state for change detection
let previousHoveredUuids: string[] = []
let previousDeepestUuid: string | null = null
let previousEditableFieldRect: Rectangle | null = null

// Track whether we're currently hovering over an editable field
const isHoveringEditableField = ref(false)

// Track whether we're currently hovering over a selected block
const isHoveringSelectedBlock = ref(false)

// Initialize buffer collector with MAX_RECTS dummy rectangles
class HoverRectangleBufferCollector extends RectangleBufferCollector<HoverRectangle> {}
const collector = new HoverRectangleBufferCollector(props.gl)

// Add MAX_RECTS dummy rectangles once.
for (let i = 0; i < MAX_RECTS; i++) {
  collector.addRectangle(
    {
      id: `hover-rect-${i}`,
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      radius: [0, 0, 0, 0],
    },
    0,
  )
}
const bufferInfo = collector.createBufferInfo()

function resetHoverState() {
  previousHoveredUuids = []
  previousDeepestUuid = null
  previousEditableFieldRect = null
  hoverState.visible.fill(0)
  isHoveringEditableField.value = false
  isHoveringSelectedBlock.value = false
}

watch(selection.isChangingOptions, (isChanging) => {
  if (!isChanging) {
    resetHoverState()
  }
})

watch(selection.uuids, () => {
  // Selection changed, force hover state update on next frame.
  resetHoverState()
})

function updateHoverState(
  mouseX: number,
  mouseY: number,
  offset: { x: number; y: number },
  scale: number,
  artboardSize: { width: number; height: number },
): boolean {
  const artboardRect = {
    x: offset.x,
    y: offset.y,
    width: artboardSize.width * scale,
    height: artboardSize.height * scale,
  }

  const isOutsideArtboard =
    mouseX < artboardRect.x ||
    mouseX > artboardRect.x + artboardRect.width ||
    mouseY < artboardRect.y ||
    mouseY > artboardRect.y + artboardRect.height

  // Early exit: if mouse is outside artboard, nothing can be hovered.
  if (isOutsideArtboard) {
    // Check if we need to clear state.
    if (
      DEBUG ||
      previousHoveredUuids.length > 0 ||
      previousEditableFieldRect !== null
    ) {
      hoverState.visible.fill(0)
      isHoveringEditableField.value = false
      isHoveringSelectedBlock.value = false
      if (!DEBUG) {
        previousHoveredUuids = []
        previousDeepestUuid = null
        previousEditableFieldRect = null
      }
      return true
    }
    return false
  }

  // Convert mouse position to artboard space.
  const artboardMouseX = mouseX / scale - offset.x / scale
  const artboardMouseY = mouseY / scale - offset.y / scale

  // Find all hovered blocks.
  const hoveredUuids: string[] = []
  const visibleBlocks = dom.getVisibleBlocks()

  for (let i = 0; i < visibleBlocks.length; i++) {
    const uuid = visibleBlocks[i]
    if (!uuid) continue

    const rawRect = dom.getBlockRect(uuid)
    if (!rawRect) continue

    const rect = ui.getViewportRelativeRect(rawRect, scale, offset)
    const blockRect = {
      x: rect.x / scale - offset.x / scale,
      y: rect.y / scale - offset.y / scale,
      width: rect.width / scale,
      height: rect.height / scale,
    }

    if (isInsideRect(artboardMouseX, artboardMouseY, blockRect)) {
      hoveredUuids.push(uuid)
    }
  }

  const deepestUuid = getDeepestUuid(hoveredUuids)

  // Filter out selected blocks.
  const selectedUuids = selection.uuids.value
  const unselectedHoveredUuids = hoveredUuids.filter(
    (uuid) => !selectedUuids.includes(uuid),
  )

  // Check if anything changed compared to previous frame.
  const hoveredChanged =
    unselectedHoveredUuids.length !== previousHoveredUuids.length ||
    unselectedHoveredUuids.some(
      (uuid, i) => uuid !== previousHoveredUuids[i],
    ) ||
    deepestUuid !== previousDeepestUuid

  // Find hovered editable field using the editable provider
  let hoveredEditableFieldRect: Rectangle | null = null
  const editableRects = editable.getVisible()
  for (let i = 0; i < editableRects.length; i++) {
    const editableRect = editableRects[i]!
    if (isInsideRect(artboardMouseX, artboardMouseY, editableRect)) {
      hoveredEditableFieldRect = editableRect
      break
    }
  }

  // Quick check if we can skip rendering updates
  if (!hoveredChanged && !DEBUG) {
    // Check if editable field also unchanged
    const editableFieldChanged =
      (hoveredEditableFieldRect === null) !==
        (previousEditableFieldRect === null) ||
      (hoveredEditableFieldRect &&
        previousEditableFieldRect &&
        (hoveredEditableFieldRect.x !== previousEditableFieldRect.x ||
          hoveredEditableFieldRect.y !== previousEditableFieldRect.y ||
          hoveredEditableFieldRect.width !== previousEditableFieldRect.width ||
          hoveredEditableFieldRect.height !== previousEditableFieldRect.height))

    if (!editableFieldChanged) {
      return false
    }
  }

  // Something changed, state needs updating.
  const shouldHighlightDeepest =
    deepestUuid && unselectedHoveredUuids.includes(deepestUuid)

  // Reset all rectangles to invisible.
  hoverState.visible.fill(0)

  // Map hovered blocks to rectangles by nesting level.
  const nestingMap: Map<number, string> = new Map()

  for (let i = 0; i < unselectedHoveredUuids.length; i++) {
    const uuid = unselectedHoveredUuids[i]!
    const level = Math.min(state.getNestingLevel(uuid), 9)
    if (!nestingMap.has(level)) {
      nestingMap.set(level, uuid)
    }
  }

  // Update rectangles for each nesting level.
  for (const [level, uuid] of nestingMap) {
    const rect = dom.getBlockRect(uuid)
    const block = dom.findBlock(uuid)
    if (!rect || !block) continue

    const el = dom.getDragElement(block)
    if (!el) continue

    const style = theme.getDraggableStyle(el)
    const isDeepest = shouldHighlightDeepest && uuid === deepestUuid

    // Position.
    hoverState.positions[level * 4 + 0] = rect.x
    hoverState.positions[level * 4 + 1] = rect.y
    hoverState.positions[level * 4 + 2] = rect.width
    hoverState.positions[level * 4 + 3] = rect.height

    // Radius.
    hoverState.radii[level * 4 + 0] = style.radius[0]!
    hoverState.radii[level * 4 + 1] = style.radius[1]!
    hoverState.radii[level * 4 + 2] = style.radius[2]!
    hoverState.radii[level * 4 + 3] = style.radius[3]!

    // Type: 0=mono, 1=accent, 3=white (inverted), 4=lime (library/reusable).
    let type = 0
    if (isDeepest) {
      // Check if this block is from the library (reusable)
      const isFromLibrary = state.fromLibraryUuids.value.includes(uuid)
      if (isFromLibrary) {
        type = 4
      } else {
        type = style.isInverted ? 3 : 1
      }
    }
    hoverState.types[level] = type

    // Visible
    hoverState.visible[level] = 1
  }

  // Update editable field rectangle if hovered (rect index 10).
  if (hoveredEditableFieldRect) {
    // Inset the rect by 2px on all sides
    const inset = 2
    hoverState.positions[10 * 4 + 0] = hoveredEditableFieldRect.x + inset
    hoverState.positions[10 * 4 + 1] = hoveredEditableFieldRect.y + inset
    hoverState.positions[10 * 4 + 2] =
      hoveredEditableFieldRect.width - inset * 2
    hoverState.positions[10 * 4 + 3] =
      hoveredEditableFieldRect.height - inset * 2

    // No radius for editable fields.
    hoverState.radii[10 * 4 + 0] = 0
    hoverState.radii[10 * 4 + 1] = 0
    hoverState.radii[10 * 4 + 2] = 0
    hoverState.radii[10 * 4 + 3] = 0

    // Type 2 = teal fill.
    hoverState.types[10] = 2

    // Visible.
    hoverState.visible[10] = 1
  }

  if (!DEBUG) {
    previousHoveredUuids = unselectedHoveredUuids
    previousDeepestUuid = deepestUuid
    previousEditableFieldRect = hoveredEditableFieldRect
  }

  // Update the hover state for cursor management
  isHoveringEditableField.value = hoveredEditableFieldRect !== null

  // Check if we're hovering over any selected block
  isHoveringSelectedBlock.value = hoveredUuids.some((uuid) =>
    selectedUuids.includes(uuid),
  )

  return true
}

const uniforms = computed(() => {
  return {
    u_color_mono: toShaderColor(theme.mono.value[300]),
    u_color_accent: toShaderColor(theme.accent.value[600]),
    u_color_teal: toShaderColor(theme.teal.value.normal),
    u_color_white: toShaderColor([255, 255, 255]),
    u_color_lime: toShaderColor(theme.lime.value.normal),
  }
})

onBlokkliEvent('state:reloaded', () => {
  resetHoverState()
})

onBlokkliEvent('ui:resized', () => {
  resetHoverState()
})

// Register WebGL renderer with zIndex 200 (hover layer)
defineRenderer('hover-overlay', {
  zIndex: 200,
  enabled: () => !selection.isChangingOptions.value,
  cursor: () => {
    // Priority 1: Editable field (if not in readonly mode)
    if (isHoveringEditableField.value && state.editMode.value !== 'readonly') {
      return 'text'
    }

    // Priority 2: Selected block (if in editing mode)
    if (isHoveringSelectedBlock.value && state.editMode.value === 'editing') {
      return 'grab'
    }

    return null
  },
  render: (ctx) => {
    if (!bufferInfo) {
      return
    }

    updateHoverState(
      ctx.mouseX,
      ctx.mouseY,
      ctx.artboardOffset,
      ctx.artboardScale,
      ctx.artboardSize,
    )

    props.gl.useProgram(programInfo.program)

    setUniforms(programInfo, uniforms.value)
    setUniforms(programInfo, {
      u_hover_positions: hoverState.positions,
      u_hover_radii: hoverState.radii,
      u_hover_types: hoverState.types,
      u_hover_visible: hoverState.visible,
    })
    animation.setSharedUniforms(props.gl, programInfo)
    setBuffersAndAttributes(props.gl, programInfo, bufferInfo)
    drawBufferInfo(props.gl, bufferInfo, props.gl.TRIANGLES)
  },
})
</script>

<script lang="ts">
export default {
  name: 'HoverOverlay',
}
</script>
