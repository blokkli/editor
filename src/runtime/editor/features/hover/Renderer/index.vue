<template>
  <div />
</template>

<script lang="ts" setup>
import { useBlokkli, computed, ref, watch } from '#imports'
import {
  setBuffersAndAttributes,
  drawBufferInfo,
  setUniforms,
  type BufferInfo,
} from 'twgl.js'
import vs from './vertex.glsl?raw'
import fs from './fragment.glsl?raw'
import { RectangleBufferCollector } from '#blokkli/editor/helpers/webgl'
import { isInsideRect } from '#blokkli/editor/helpers/geometry'
import { toShaderColor } from '#blokkli/editor/helpers/color'
import type { RGB } from './../../../../../global/types/theme'
import { defineRenderer, onBlokkliEvent } from '#blokkli/editor/composables'
import type { Rectangle } from '#blokkli/editor/types/geometry'

const {
  animation,
  theme,
  dom,
  selection,
  state,
  ui,
  directive,
  blocks,
  fields,
  permissions,
  context,
} = useBlokkli()

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
 * When blocks share the same nesting level, the one from the field with the
 * higher z-index wins.
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
    } else if (level === maxLevel) {
      if (fields.compareFieldPriority(uuid, deepestUuid) > 0) {
        deepestUuid = uuid
      }
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

// Custom collector class
class HoverRectangleBufferCollector extends RectangleBufferCollector<HoverRectangle> {
  getBufferInfo(gl: WebGLRenderingContext): BufferInfo {
    if (!this.bufferInfo) {
      this.bufferInfo = this.createBufferInfo(gl)
    }

    return this.bufferInfo
  }
}

function resetHoverState() {
  previousHoveredUuids = []
  previousDeepestUuid = null
  previousEditableFieldRect = null
  hoverState.visible.fill(0)
  isHoveringEditableField.value = false
  isHoveringSelectedBlock.value = false
}

watch(ui.isChangingOptions, (isChanging) => {
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
    // Always clear hover state when outside artboard
    const needsUpdate =
      previousHoveredUuids.length > 0 ||
      previousEditableFieldRect !== null ||
      isHoveringEditableField.value ||
      isHoveringSelectedBlock.value

    hoverState.visible.fill(0)
    isHoveringEditableField.value = false
    isHoveringSelectedBlock.value = false
    previousHoveredUuids = []
    previousDeepestUuid = null
    previousEditableFieldRect = null

    return needsUpdate
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
      // Skip blocks inside a restricted ancestor — they are not interactive.
      if (!permissions.blockHasRestrictedAncestor(uuid)) {
        hoveredUuids.push(uuid)
      }
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

  // Find hovered editable field that belongs to the deepest/winning block.
  // When blocks overlap at the same nesting level, only show the editable
  // from the block with the higher field z-index.
  let hoveredEditableFieldRect: Rectangle | null = null
  const editableRects = directive.getVisible('editable')
  let fallbackEditableRect: Rectangle | null = null

  for (let i = 0; i < editableRects.length; i++) {
    const editableRect = editableRects[i]!
    if (!isInsideRect(artboardMouseX, artboardMouseY, editableRect)) continue

    // Extract entity UUID from the rect key (format: directive:entityType:uuid:fieldName).
    const key = (editableRect as Rectangle & { key: string }).key
    const entityUuid = key.split(':')[2]!

    // Skip editable fields on blocks where the user lacks edit permission
    // or that are inside a restricted ancestor.
    const block = blocks.getBlock(entityUuid)
    if (
      block &&
      (!permissions.checkBlockBundlePermission(block.bundle, 'edit') ||
        permissions.blockHasRestrictedAncestor(entityUuid))
    ) {
      continue
    }

    if (deepestUuid && entityUuid === deepestUuid) {
      // Editable belongs to the winning block.
      hoveredEditableFieldRect = editableRect
      break
    }

    if (!fallbackEditableRect && !hoveredUuids.includes(entityUuid)) {
      // Non-block editable (e.g. host entity) — use as fallback.
      fallbackEditableRect = editableRect
    }
  }

  if (!hoveredEditableFieldRect) {
    hoveredEditableFieldRect = fallbackEditableRect
  }

  // Quick check if we can skip rendering updates
  if (!hoveredChanged) {
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
    const existing = nestingMap.get(level)
    if (!existing) {
      nestingMap.set(level, uuid)
    } else if (fields.compareFieldPriority(uuid, existing) > 0) {
      nestingMap.set(level, uuid)
    }
  }

  // Update rectangles for each nesting level.
  for (const [level, uuid] of nestingMap) {
    const rect = dom.getBlockRect(uuid)
    const block = blocks.getBlock(uuid)
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

    // Type: 0=mono, 1=accent, 3=white (inverted), 4=lime (library), 5=yellow (restricted), 6=yellow (outdated).
    let type = 0
    if (isDeepest) {
      const isRestricted =
        !permissions.checkBlockBundlePermission(block.bundle, 'edit') ||
        !permissions.checkBlockBundlePermission(block.bundle, 'delete') ||
        !permissions.checkBlockBundlePermission(block.bundle, 'add')
      const isOutdated = block.outdatedTranslations.includes(
        context.value.language,
      )
      if (isRestricted) {
        type = 5
      } else if (isOutdated) {
        type = 6
      } else if (state.fromLibraryUuids.value.includes(uuid)) {
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

  previousHoveredUuids = unselectedHoveredUuids
  previousDeepestUuid = deepestUuid
  previousEditableFieldRect = hoveredEditableFieldRect

  // Update the hover state for cursor management
  isHoveringEditableField.value = hoveredEditableFieldRect !== null

  // Check if the deepest hovered block is selected
  // We only care about the most specific block, not parent blocks
  isHoveringSelectedBlock.value =
    deepestUuid !== null && selectedUuids.includes(deepestUuid)

  return true
}

const uniforms = computed(() => {
  return {
    u_color_mono: theme.mono.value[300],
    u_color_accent: theme.accent.value[600],
    u_color_teal: theme.teal.value.normal,
    u_color_white: [255, 255, 255] as RGB,
    u_color_lime: theme.lime.value.normal,
    u_color_yellow: theme.yellow.value.normal,
  }
})

onBlokkliEvent('state:reloaded', () => {
  resetHoverState()
})

onBlokkliEvent('ui:resized', () => {
  resetHoverState()
})

// Register WebGL renderer with zIndex 200 (hover layer)
const { collector } = defineRenderer('hover-overlay', {
  zIndex: 200,
  collector: () => {
    const c = new HoverRectangleBufferCollector()
    // Add MAX_RECTS dummy rectangles once.
    for (let i = 0; i < MAX_RECTS; i++) {
      c.addRectangle(
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
    return c
  },
  program: () => ({ shaders: [vs, fs] }),
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
  render: (ctx, gl, program) => {
    const bufferInfo = collector.getBufferInfo(gl)

    if (!ui.openTooltip.value) {
      updateHoverState(
        ctx.mouseX,
        ctx.mouseY,
        ctx.artboardOffset,
        ctx.artboardScale,
        ctx.artboardSize,
      )
    }

    gl.useProgram(program.program)

    setUniforms(program, {
      u_color_mono: toShaderColor(uniforms.value.u_color_mono),
      u_color_accent: toShaderColor(uniforms.value.u_color_accent),
      u_color_teal: toShaderColor(uniforms.value.u_color_teal),
      u_color_white: toShaderColor(uniforms.value.u_color_white),
      u_color_lime: toShaderColor(uniforms.value.u_color_lime),
      u_color_yellow: toShaderColor(uniforms.value.u_color_yellow),
      u_hover_positions: hoverState.positions,
      u_hover_radii: hoverState.radii,
      u_hover_types: hoverState.types,
      u_hover_visible: hoverState.visible,
      u_opacity: ctx.changeOptionsTransition,
    })
    animation.setSharedUniforms(gl, program)
    setBuffersAndAttributes(gl, program, bufferInfo)
    drawBufferInfo(gl, bufferInfo, gl.TRIANGLES)
  },
  renderFallback: (ctx, ctx2d) => {
    if (!ui.openTooltip.value) {
      updateHoverState(
        ctx.mouseX,
        ctx.mouseY,
        ctx.artboardOffset,
        ctx.artboardScale,
        ctx.artboardSize,
      )
    }

    // Helper to convert RGB to CSS string
    const rgbToCss = (rgb: [number, number, number]) => {
      return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`
    }

    const rgbaToCss = (rgb: [number, number, number], alpha: number) => {
      return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`
    }

    const colors = uniforms.value
    const borderThickness = 1.5 * ctx.dpi
    const dashLength = 7 * ctx.dpi

    // Apply global opacity
    ctx2d.globalAlpha = ctx.changeOptionsTransition

    // Draw all visible hover rectangles
    for (let i = 0; i < MAX_RECTS; i++) {
      // Check if this rectangle is visible
      if (hoverState.visible[i] !== 1) {
        continue
      }

      // Get position
      const x = hoverState.positions[i * 4 + 0]!
      const y = hoverState.positions[i * 4 + 1]!
      const width = hoverState.positions[i * 4 + 2]!
      const height = hoverState.positions[i * 4 + 3]!

      // Get radii
      const radiusTopLeft = hoverState.radii[i * 4 + 0]!
      const radiusTopRight = hoverState.radii[i * 4 + 1]!
      const radiusBottomRight = hoverState.radii[i * 4 + 2]!
      const radiusBottomLeft = hoverState.radii[i * 4 + 3]!

      // Transform to viewport coordinates
      const viewportX = (x * ctx.artboardScale + ctx.artboardOffset.x) * ctx.dpi
      const viewportY = (y * ctx.artboardScale + ctx.artboardOffset.y) * ctx.dpi
      const viewportWidth = width * ctx.artboardScale * ctx.dpi
      const viewportHeight = height * ctx.artboardScale * ctx.dpi

      // Get type and determine rendering approach
      const type = hoverState.types[i]!

      // Type 2 = editable field: fill + solid border
      if (type === 2) {
        // Draw fill
        ctx2d.fillStyle = rgbaToCss(colors.u_color_teal, 0.2)

        const maxRadius = Math.min(viewportWidth, viewportHeight) / 2
        const rtl = Math.min(
          radiusTopLeft * ctx.artboardScale * ctx.dpi,
          maxRadius,
        )
        const rtr = Math.min(
          radiusTopRight * ctx.artboardScale * ctx.dpi,
          maxRadius,
        )
        const rbr = Math.min(
          radiusBottomRight * ctx.artboardScale * ctx.dpi,
          maxRadius,
        )
        const rbl = Math.min(
          radiusBottomLeft * ctx.artboardScale * ctx.dpi,
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
        ctx2d.lineTo(
          viewportX + viewportWidth,
          viewportY + viewportHeight - rbr,
        )
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
        ctx2d.fill()

        // Draw solid border
        ctx2d.strokeStyle = rgbToCss(colors.u_color_teal)
        ctx2d.lineWidth = borderThickness
        ctx2d.setLineDash([])
        ctx2d.stroke()
      } else {
        // Type 0, 1, 3, 4, 5, 6 = blocks: dashed border only
        // Select color: 0=mono, 1=accent, 3=white, 4=lime, 5=yellow (restricted), 6=yellow (outdated)
        let strokeColor = colors.u_color_mono
        if (type === 5 || type === 6) {
          strokeColor = colors.u_color_yellow
        } else if (type === 4) {
          strokeColor = colors.u_color_lime
        } else if (type === 3) {
          strokeColor = colors.u_color_white
        } else if (type === 1) {
          strokeColor = colors.u_color_accent
        }

        ctx2d.strokeStyle = rgbToCss(strokeColor)
        ctx2d.lineWidth = borderThickness
        ctx2d.setLineDash([dashLength, dashLength])

        const maxRadius = Math.min(viewportWidth, viewportHeight) / 2
        const rtl = Math.min(
          radiusTopLeft * ctx.artboardScale * ctx.dpi,
          maxRadius,
        )
        const rtr = Math.min(
          radiusTopRight * ctx.artboardScale * ctx.dpi,
          maxRadius,
        )
        const rbr = Math.min(
          radiusBottomRight * ctx.artboardScale * ctx.dpi,
          maxRadius,
        )
        const rbl = Math.min(
          radiusBottomLeft * ctx.artboardScale * ctx.dpi,
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
        ctx2d.lineTo(
          viewportX + viewportWidth,
          viewportY + viewportHeight - rbr,
        )
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

      // Reset line dash
      ctx2d.setLineDash([])
    }

    // Reset global alpha
    ctx2d.globalAlpha = 1
  },
})
</script>

<script lang="ts">
export default {
  name: 'HoverOverlay',
}
</script>
