<template>
  <div />
</template>

<script lang="ts" setup>
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import type { Rectangle } from '#blokkli/types'
import { useBlokkli, onBeforeUnmount, watch, computed } from '#imports'
import { setBuffersAndAttributes, drawBufferInfo, setUniforms } from 'twgl.js'
import vs from './vertex.glsl?raw'
import fs from './fragment.glsl?raw'
import { RectangleBufferCollector } from '#blokkli/helpers/webgl'
import { toShaderColor, isInsideRect } from '#blokkli/helpers'

const props = defineProps<{
  gl: WebGLRenderingContext
}>()

const { animation, theme, dom, selection, state, ui } = useBlokkli()

const programInfo = animation.registerProgram('hover', props.gl, [vs, fs])

// Debug mode: disable caching of previous state to always recalculate.
const DEBUG = false

// How many hover quads are supported.
// This means that we support 10 blocks + 1 editable field.
// Which means that there can only ever be 10 hover blocks visible,
// so a max. nesting level of 10 (which should be more than enough).
const MAX_RECTS = 11

// Cache duration for getBoundingClientRect() results (in milliseconds)
const RECT_CACHE_DURATION = 5000

type HoverRectangle = Rectangle & {
  id: string
  index: number
  radius: [number, number, number, number]
}

type CachedRect = {
  rect: Rectangle // World coordinates (artboard space)
  timestamp: number
}

type EditableFieldInfo = {
  fieldName: string
  blockUuid: string
  element: HTMLElement
  cachedRect?: CachedRect
}

type HoverState = {
  // Rect 0-9: Hover rectangles by nesting level
  // Rect 10: Editable field
  positions: Float32Array // 11 vec4s = 44 floats (x, y, width, height)
  radii: Float32Array // 11 vec4s = 44 floats (topLeft, topRight, bottomRight, bottomLeft)
  types: Float32Array // 11 floats (0=mono, 1=accent, 2=teal fill)
  visible: Float32Array // 11 floats (0=hidden, 1=visible)
}

const editableFieldCache: Map<string, EditableFieldInfo[]> = new Map()

/**
 * Get the bounding rect in world coordinates for an editable field element.
 * Uses cached value if available and not expired.
 */
function getCachedRect(
  field: EditableFieldInfo,
  scale: number,
  offset: { x: number; y: number },
): Rectangle {
  const now = Date.now()

  // Check if cached rect is valid
  if (
    field.cachedRect &&
    now - field.cachedRect.timestamp < RECT_CACHE_DURATION
  ) {
    return field.cachedRect.rect
  }

  // Get fresh rect and transform to world coordinates
  const fieldRect = field.element.getBoundingClientRect()
  const rect = {
    x: fieldRect.x / scale - offset.x / scale,
    y: fieldRect.y / scale - offset.y / scale,
    width: fieldRect.width / scale,
    height: fieldRect.height / scale,
  }

  field.cachedRect = {
    rect,
    timestamp: now,
  }

  return rect
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
let previousEditableField: string | null = null

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
  previousEditableField = null
  hoverState.visible.fill(0)
}

watch(selection.isChangingOptions, (isChanging) => {
  if (!isChanging) {
    editableFieldCache.clear()
    resetHoverState()
  }
})

watch(selection.uuids, (selectedUuids) => {
  // Clear cache for selected UUIDs only if they have 0 editable fields.
  for (let i = 0; i < selectedUuids.length; i++) {
    const uuid = selectedUuids[i]!
    const cachedFields = editableFieldCache.get(uuid)
    if (cachedFields && cachedFields.length === 0) {
      editableFieldCache.delete(uuid)
    }
  }

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
      previousEditableField !== null
    ) {
      hoverState.visible.fill(0)
      if (!DEBUG) {
        previousHoveredUuids = []
        previousDeepestUuid = null
        previousEditableField = null
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
  // We need to determine editable field first to do a full comparison.
  let hoveredEditableField: string | null = null

  // Quick check if we can skip the expensive editable field check.
  const hoveredChanged =
    unselectedHoveredUuids.length !== previousHoveredUuids.length ||
    unselectedHoveredUuids.some(
      (uuid, i) => uuid !== previousHoveredUuids[i],
    ) ||
    deepestUuid !== previousDeepestUuid

  // Also track if deepest changed (for editable field queries).
  const deepestChanged = deepestUuid !== previousDeepestUuid

  if (!hoveredChanged && !DEBUG) {
    // Hovered blocks unchanged, but still need to check editable field for mouse movement.
    if (deepestUuid) {
      // Look up editable fields, checking ancestors if needed.
      let editableFields = editableFieldCache.get(deepestUuid)

      // Check if any ancestor is cached.
      if (!editableFields) {
        const cachedKeys = Array.from(editableFieldCache.keys())
        for (let i = 0; i < cachedKeys.length; i++) {
          const cachedUuid = cachedKeys[i]!
          if (state.isChildOf(deepestUuid, cachedUuid)) {
            const ancestorFields = editableFieldCache.get(cachedUuid)
            // Only use ancestor cache if it contains fields for this specific block.
            const hasFieldsForBlock = ancestorFields?.some(
              (f) => f.blockUuid === deepestUuid,
            )
            if (hasFieldsForBlock) {
              editableFields = ancestorFields
              break
            }
          }
        }
      }

      if (editableFields) {
        for (let i = 0; i < editableFields.length; i++) {
          const field = editableFields[i]!
          if (field.blockUuid === deepestUuid) {
            const rect = getCachedRect(field, scale, offset)
            if (isInsideRect(artboardMouseX, artboardMouseY, rect)) {
              hoveredEditableField = `${deepestUuid}:${field.fieldName}`
              break
            }
          }
        }
      }
    }

    // If editable field also unchanged, we can skip everything.
    if (hoveredEditableField === previousEditableField) {
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

    // Type: 0=mono, 1=accent, 3=white (inverted).
    let type = 0
    if (isDeepest) {
      type = style.isInverted ? 3 : 1
    }
    hoverState.types[level] = type

    // Visible
    hoverState.visible[level] = 1
  }

  // Handle editable field (rect index 10)
  // Query editable fields if deepest block changed (regardless of selection state).
  if (deepestUuid && deepestChanged) {
    let editableFields = editableFieldCache.get(deepestUuid)

    // Check if any ancestor are cached.
    if (!editableFields) {
      const cachedKeys = Array.from(editableFieldCache.keys())
      for (let i = 0; i < cachedKeys.length; i++) {
        const cachedUuid = cachedKeys[i]!
        if (state.isChildOf(deepestUuid, cachedUuid)) {
          const ancestorFields = editableFieldCache.get(cachedUuid)
          // Only use ancestor cache if it contains fields for this specific block.
          const hasFieldsForBlock = ancestorFields?.some(
            (f) => f.blockUuid === deepestUuid,
          )
          if (hasFieldsForBlock) {
            editableFields = ancestorFields
            break
          }
        }
      }
    }

    // Query and cache if not found.
    if (!editableFields) {
      const block = dom.findBlock(deepestUuid)

      if (block) {
        const el = dom.getDragElement(block)

        if (el) {
          editableFields = []

          if (el.dataset.blokkliEditableField) {
            const fieldName = el.dataset.blokkliEditableField
            editableFields.push({
              fieldName,
              blockUuid: deepestUuid,
              element: el,
            })
          } else {
            const editableElements = el.querySelectorAll(
              '[data-blokkli-editable-field]',
            )

            for (let i = 0; i < editableElements.length; i++) {
              const fieldEl = editableElements[i]
              if (fieldEl instanceof HTMLElement) {
                const fieldName = fieldEl.dataset.blokkliEditableField
                if (fieldName) {
                  const closestBlock = fieldEl.closest('[data-uuid]')
                  const blockUuid =
                    closestBlock instanceof HTMLElement
                      ? closestBlock.dataset.uuid
                      : null

                  if (blockUuid) {
                    editableFields.push({
                      fieldName,
                      blockUuid,
                      element: fieldEl,
                    })
                  }
                }
              }
            }
          }
          editableFieldCache.set(deepestUuid, editableFields)
        }
      }
    }

    // Check if any editable field is hovered.
    if (editableFields) {
      for (let i = 0; i < editableFields.length; i++) {
        const field = editableFields[i]!
        if (field.blockUuid === deepestUuid) {
          const rect = getCachedRect(field, scale, offset)

          if (isInsideRect(artboardMouseX, artboardMouseY, rect)) {
            hoveredEditableField = `${deepestUuid}:${field.fieldName}`
            break
          }
        }
      }
    }
  }

  // Update editable field rectangle if hovered.
  if (hoveredEditableField && deepestUuid) {
    // Look up editable fields, checking ancestors if needed.
    let editableFields = editableFieldCache.get(deepestUuid)

    // Check if any ancestor is cached.
    if (!editableFields) {
      const cachedKeys = Array.from(editableFieldCache.keys())
      for (let i = 0; i < cachedKeys.length; i++) {
        const cachedUuid = cachedKeys[i]!
        if (state.isChildOf(deepestUuid, cachedUuid)) {
          const ancestorFields = editableFieldCache.get(cachedUuid)
          // Only use ancestor cache if it contains fields for this specific block.
          const hasFieldsForBlock = ancestorFields?.some(
            (f) => f.blockUuid === deepestUuid,
          )
          if (hasFieldsForBlock) {
            editableFields = ancestorFields
            break
          }
        }
      }
    }

    if (editableFields) {
      for (let i = 0; i < editableFields.length; i++) {
        const field = editableFields[i]!
        if (`${field.blockUuid}:${field.fieldName}` === hoveredEditableField) {
          // Get cached rect in world coordinates (or fetch fresh if expired)
          const rect = getCachedRect(field, scale, offset)

          // Editable field at index 10.
          hoverState.positions[10 * 4 + 0] = rect.x
          hoverState.positions[10 * 4 + 1] = rect.y
          hoverState.positions[10 * 4 + 2] = rect.width
          hoverState.positions[10 * 4 + 3] = rect.height

          // No radius for editable fields.
          hoverState.radii[10 * 4 + 0] = 0
          hoverState.radii[10 * 4 + 1] = 0
          hoverState.radii[10 * 4 + 2] = 0
          hoverState.radii[10 * 4 + 3] = 0

          // Type 2 = teal fill.
          hoverState.types[10] = 2

          // Visible.
          hoverState.visible[10] = 1
          break
        }
      }
    }
  }

  if (!DEBUG) {
    previousHoveredUuids = unselectedHoveredUuids
    previousDeepestUuid = deepestUuid
    previousEditableField = hoveredEditableField
  }

  return true
}

const uniforms = computed(() => {
  return {
    u_color_mono: toShaderColor(theme.mono.value[300]),
    u_color_accent: toShaderColor(theme.accent.value[600]),
    u_color_teal: toShaderColor(theme.teal.value.normal),
    u_color_white: toShaderColor([255, 255, 255]),
  }
})

onBlokkliEvent('state:reloaded', () => {
  editableFieldCache.clear()
  resetHoverState()
})

onBlokkliEvent('ui:resized', () => {
  editableFieldCache.clear()
  resetHoverState()
})

onBlokkliEvent('canvas:draw', (e) => {
  if (!bufferInfo || selection.isChangingOptions.value) {
    return
  }

  updateHoverState(
    e.mouseX,
    e.mouseY,
    e.artboardOffset,
    e.artboardScale,
    e.artboardSize,
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
})

onBeforeUnmount(() => {
  props.gl.clear(props.gl.COLOR_BUFFER_BIT)
})
</script>

<script lang="ts">
export default {
  name: 'HoverOverlay',
}
</script>
