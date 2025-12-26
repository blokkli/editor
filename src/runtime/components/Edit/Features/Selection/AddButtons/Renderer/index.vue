<template>
  <Teleport to="#bk-canvas-overlay">
    <div
      class="bk bk-add-button-tooltip"
      :class="{ 'bk-is-field': tooltipData?.isField }"
      :style="{
        position: 'fixed',
        left: (tooltipData?.x ?? 0) + 'px',
        top: (tooltipData?.y ?? 0) + 'px',
        transform: tooltipData?.transform ?? 'translate(0, 0)',
        visibility: tooltipData ? 'visible' : 'hidden',
      }"
    >
      {{ tooltipData?.text ?? '' }}
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { useBlokkli, computed, ref } from '#imports'
import {
  setBuffersAndAttributes,
  drawBufferInfo,
  setUniforms,
  type BufferInfo,
} from 'twgl.js'
import vs from './vertex.glsl?raw'
import fs from './fragment.glsl?raw'
import { RectangleBufferCollector } from '#blokkli/editor/helpers/webgl'
import type { Rectangle } from '#blokkli/types'
import { toShaderColor, getFieldKey } from '#blokkli/helpers'
import {
  getChildrenOrientation,
  type Orientation,
  determineCanAddChildren,
} from '#blokkli/helpers/dropTargets'
import { isInternalBundle } from '#blokkli/helpers/bundles'
import { itemEntityType } from '#blokkli-build/config'
import { defineRenderer, onBlokkliEvent } from '#blokkli/editor/composables'

const {
  animation,
  theme,
  dom,
  selection,
  state,
  types,
  ui,
  $t,
  blocks,
  fields,
} = useBlokkli()

// Store field tooltips for empty field buttons
const emptyFieldTooltips = ref<string[]>([])

// Store current UUID and bundle label
const currentUuid = ref<string>('')
const currentBundleLabel = ref<string>('')
const currentSingleAllowedBundleLabel = ref<string | null>(null)

// Tooltip data for hovered button
const tooltipData = computed<{
  x: number
  y: number
  transform: string
  position: 'top' | 'bottom' | 'left' | 'right'
  text: string
  isField: boolean
} | null>(() => {
  if (hoveredCircle.value < 0) {
    return null
  }

  const index = hoveredCircle.value
  const artboardX = circlePositions[index * 2]
  const artboardY = circlePositions[index * 2 + 1]

  if (artboardX === undefined || artboardY === undefined) {
    return null
  }

  // Convert artboard coordinates to screen coordinates
  const scale = ui.artboardScale.value
  const offset = ui.artboardOffset.value

  const screenX = artboardX * scale + offset.x
  const screenY = artboardY * scale + offset.y

  // Determine tooltip position based on button type and orientation
  let transform: string
  let position: 'top' | 'bottom' | 'left' | 'right'
  let text: string
  let isField = false

  if (index === 0 || index === 1) {
    // Before/after buttons - position based on orientation
    const orientation = currentOrientation.value

    // Compute tooltip text
    if (currentSingleAllowedBundleLabel.value) {
      if (index === 0) {
        text = $t('addButtonBundleBefore', 'Add "@bundle" before').replace(
          '@bundle',
          currentSingleAllowedBundleLabel.value,
        )
      } else {
        text = $t('addButtonBundleAfter', 'Add "@bundle" after').replace(
          '@bundle',
          currentSingleAllowedBundleLabel.value,
        )
      }
    } else {
      if (index === 0) {
        text = $t('addButtonBeforeBundle', 'Add before...')
      } else {
        text = $t('addButtonAfterBundle', 'Add after...')
      }
    }

    if (orientation === 'horizontal') {
      if (index === 0) {
        // Left button - tooltip to the right
        transform = `translate(${TOOLTIP_MARGIN}px, -50%)`
        position = 'right'
      } else {
        // Right button - tooltip to the left
        transform = `translate(calc(-100% - ${TOOLTIP_MARGIN}px), -50%)`
        position = 'left'
      }
    } else {
      // Vertical orientation
      if (index === 0) {
        // Top button - tooltip below
        transform = `translate(-50%, ${TOOLTIP_MARGIN}px)`
        position = 'bottom'
      } else {
        // Bottom button - tooltip above
        transform = `translate(-50%, calc(-100% - ${TOOLTIP_MARGIN}px))`
        position = 'top'
      }
    }
  } else {
    // Empty field buttons - show above by default
    transform = `translate(-50%, calc(-100% - ${TOOLTIP_MARGIN}px))`
    position = 'top'
    isField = true

    const fieldIndex = index - 2
    text = emptyFieldTooltips.value[fieldIndex] || 'Add to field'
  }

  return { x: screenX, y: screenY, transform, position, text, isField }
})

const emit = defineEmits<{
  (
    e: 'toggle',
    data: {
      position: 'before' | 'after'
      coordinates: { x: number; y: number }
    },
  ): void
  (
    e: 'toggleField',
    data: { index: number; coordinates: { x: number; y: number } },
  ): void
}>()

// Total number of circles we support (2 for before/after + 8 for empty fields)
const MAX_CIRCLES = 10

// Button radius in pixels
const BUTTON_RADIUS = 12

// Tooltip margin in pixels (distance from button center to tooltip edge)
const TOOLTIP_MARGIN = 20

// Outward shift for before/after buttons in pixels

type CircleRectangle = Rectangle & {
  id: string
  index: number
}

class CircleBufferCollector extends RectangleBufferCollector<CircleRectangle> {}

// Cache for bufferInfo (created on first render)
let bufferInfoCache: BufferInfo | null = null

// Circle state
const circlePositions = new Float32Array(MAX_CIRCLES * 2) // x, y for each circle
const circleVisible = new Float32Array(MAX_CIRCLES) // visibility for each circle

// Track which circle is being hovered (-1 for none)
const hoveredCircle = ref<number>(-1)

const color = computed(() => {
  return theme.accent.value[600]
})

const colorHover = computed(() => {
  return theme.accent.value[500]
})

const colorField = computed(() => {
  return theme.accent.value[400]
})

const colorFieldHover = computed(() => {
  return theme.accent.value[300]
})

// Cache orientation per UUID for performance
const orientationCache = new Map<string, Orientation>()
const currentOrientation = ref<Orientation>('horizontal')

// Cache for computed block state
type BlockStateCache = {
  canShowBeforeAfter: boolean
  emptyFieldKeys: string[]
  emptyFieldTooltips: string[]
  bundleLabel: string
  singleAllowedBundleLabel: string | null
}

const blockStateCache = new Map<string, BlockStateCache>()

function getOrientationForUuid(uuid: string): Orientation {
  let cached = orientationCache.get(uuid)
  if (!cached) {
    const item = blocks.getBlock(uuid)
    if (item) {
      const field = fields.find(item.host.uuid, item.host.fieldName)
      if (field) {
        cached = getChildrenOrientation(field.element)
        orientationCache.set(uuid, cached)
      }
    }
  }
  return cached || 'horizontal'
}

function getBlockState(uuid: string): BlockStateCache {
  let cached = blockStateCache.get(uuid)
  if (!cached) {
    // Compute canShowBeforeAfter
    let canShowBeforeAfter = false
    let singleAllowedBundleLabel: string | null = null
    const block = blocks.getBlock(uuid)
    if (!block) {
      // Don't cache - block might appear in DOM later
      return {
        canShowBeforeAfter: false,
        emptyFieldKeys: [],
        emptyFieldTooltips: [],
        bundleLabel: '',
        singleAllowedBundleLabel: null,
      }
    }
    if (block) {
      const field = fields.find(block.host.uuid, block.host.fieldName)
      if (!field) {
        // Don't cache - field might appear in DOM later
        return {
          canShowBeforeAfter: false,
          emptyFieldKeys: [],
          emptyFieldTooltips: [],
          bundleLabel: '',
          singleAllowedBundleLabel: null,
        }
      }
      if (field) {
        const fieldChildren = [...field.element.children] as HTMLElement[]
        const currentCount = state.getFieldBlockCount(field.key)
        canShowBeforeAfter = determineCanAddChildren(
          field,
          fieldChildren,
          [], // Not moving any blocks, adding a new one
          currentCount,
          1, // Adding 1 new block
          [], // Don't know which bundle will be added
        )

        // Check if there's a single allowed bundle
        const allowedBundles = field.allowedBundles.filter(
          (bundle) => !isInternalBundle(bundle),
        )
        if (allowedBundles.length === 1) {
          const bundle = allowedBundles[0]
          if (bundle) {
            singleAllowedBundleLabel =
              types.getBlockBundleDefinition(bundle)?.label || bundle
          }
        }
      }
    }

    // Get bundle label
    const bundleLabel = block
      ? types.getBlockBundleDefinition(block.bundle)?.label || block.bundle
      : ''

    // Compute emptyFieldKeys and tooltips
    const emptyFieldKeys: string[] = []
    const emptyFieldTooltips: string[] = []
    if (block) {
      const fieldConfigs = types.fieldConfig.forEntityTypeAndBundle(
        itemEntityType,
        block.bundle,
      )

      for (const fieldConfig of fieldConfigs) {
        const key = getFieldKey(uuid, fieldConfig.name)
        const count = state.getFieldBlockCount(key)
        if (count === 0) {
          emptyFieldKeys.push(key)

          // Build tooltip for this field
          const fieldLabel = fieldConfig.label || fieldConfig.name

          // Get field element to check allowed bundles
          const fieldElement = fields.find(uuid, fieldConfig.name)
          if (fieldElement) {
            const allowedBundles = fieldElement.allowedBundles.filter(
              (bundle) => !isInternalBundle(bundle),
            )

            if (allowedBundles.length === 1) {
              const bundle = allowedBundles[0]
              if (bundle) {
                const singleBundleLabel =
                  types.getBlockBundleDefinition(bundle)?.label || bundle
                const tooltip = $t(
                  'addButtonBundleInsideField',
                  'Add "@bundle" inside @parentBundle » @fieldLabel',
                )
                  .replace('@bundle', singleBundleLabel)
                  .replace('@parentBundle', bundleLabel)
                  .replace('@fieldLabel', fieldLabel)
                emptyFieldTooltips.push(tooltip)
              } else {
                emptyFieldTooltips.push(
                  $t(
                    'addButtonInsideField',
                    'Add inside @parentBundle » @fieldLabel...',
                  )
                    .replace('@parentBundle', bundleLabel)
                    .replace('@fieldLabel', fieldLabel),
                )
              }
            } else {
              emptyFieldTooltips.push(
                $t(
                  'addButtonInsideField',
                  'Add inside @parentBundle » @fieldLabel...',
                )
                  .replace('@parentBundle', bundleLabel)
                  .replace('@fieldLabel', fieldLabel),
              )
            }
          } else {
            emptyFieldTooltips.push(
              $t(
                'addButtonInsideField',
                'Add inside @parentBundle » @fieldLabel...',
              )
                .replace('@parentBundle', bundleLabel)
                .replace('@fieldLabel', fieldLabel),
            )
          }
        }
      }
    }

    cached = {
      canShowBeforeAfter,
      emptyFieldKeys,
      emptyFieldTooltips,
      bundleLabel,
      singleAllowedBundleLabel,
    }
    blockStateCache.set(uuid, cached)
  }

  return cached
}

// Clear cache when state reloads
onBlokkliEvent('state:reloaded', () => {
  orientationCache.clear()
  blockStateCache.clear()
})

/**
 * Check if a point (in artboard coordinates) is inside any visible circle.
 * Returns the circle index if found, -1 otherwise.
 */
function getCircleAtPoint(x: number, y: number): number {
  // Disable hit detection when scale is too small (buttons are faded out)
  if (ui.artboardScale.value <= 0.4) {
    return -1
  }

  // Buttons are rendered at constant screen size, so radius in artboard space
  // needs to be adjusted by the inverse of the scale
  // Use scale 0.5 as minimum to avoid the fade-out scaling
  const effectiveScale = Math.max(ui.artboardScale.value, 0.5)
  const radius = BUTTON_RADIUS / effectiveScale

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
const { collector } = defineRenderer('add-buttons', {
  zIndex: 1000,
  collector: () => {
    const c = new CircleBufferCollector()
    // Add MAX_CIRCLES dummy rectangles once
    for (let i = 0; i < MAX_CIRCLES; i++) {
      c.addRectangle(
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
    return c
  },
  program: () => ({ shaders: [vs, fs] }),
  enabled: () => {
    if (selection.uuids.value.length !== 1) {
      return false
    }
    if (ui.openTooltip.value && ui.openTooltip.value !== 'add-buttons') {
      return false
    }
    if (ui.hasTransformOverlayOpen.value) {
      return false
    }
    return true
  },
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
  render: (ctx, gl, program) => {
    // Create bufferInfo on first render
    if (!bufferInfoCache) {
      bufferInfoCache = collector.createBufferInfo(gl)
    }

    if (!bufferInfoCache) {
      return
    }

    // Reset all circles to invisible
    circleVisible.fill(0)

    // Only render if exactly one block is selected
    if (ctx.selectedUuids.length !== 1) {
      return
    }

    const uuid = ctx.selectedUuids[0]
    if (!uuid) {
      return
    }

    // Get cached block state (logs only on first computation)
    const blockState = getBlockState(uuid)

    // Check if we should show before/after buttons
    if (blockState.canShowBeforeAfter) {
      const blockRect = dom.getBlockRect(uuid)
      if (!blockRect || blockRect.width === 0) {
        return
      }

      // Get cached orientation
      const orientation = getOrientationForUuid(uuid)
      currentOrientation.value = orientation
      const BUTTON_SHIFT = 2 / ctx.artboardScale

      if (orientation === 'horizontal') {
        // Horizontal layout: buttons at left and right edges
        // Circle 0: Left edge center (shifted left)
        circlePositions[0] = blockRect.x - BUTTON_SHIFT // x
        circlePositions[1] = blockRect.y + blockRect.height / 2 // y
        circleVisible[0] = 1

        // Circle 1: Right edge center (shifted right)
        circlePositions[2] = blockRect.x + blockRect.width + BUTTON_SHIFT // x
        circlePositions[3] = blockRect.y + blockRect.height / 2 // y
        circleVisible[1] = 1
      } else {
        // Vertical layout: buttons at top and bottom edges
        // Circle 0: Top edge center (shifted up)
        circlePositions[0] = blockRect.x + blockRect.width / 2 // x
        circlePositions[1] = blockRect.y - BUTTON_SHIFT // y
        circleVisible[0] = 1

        // Circle 1: Bottom edge center (shifted down)
        circlePositions[2] = blockRect.x + blockRect.width / 2 // x
        circlePositions[3] = blockRect.y + blockRect.height + BUTTON_SHIFT // y
        circleVisible[1] = 1
      }
    }

    // Update tooltip data
    currentUuid.value = uuid
    currentBundleLabel.value = blockState.bundleLabel
    currentSingleAllowedBundleLabel.value = blockState.singleAllowedBundleLabel

    // Render empty field buttons (circles 2-9)
    if (blockState.emptyFieldKeys.length > 0) {
      // Update the field tooltips
      emptyFieldTooltips.value = blockState.emptyFieldTooltips

      for (let i = 0; i < blockState.emptyFieldKeys.length && i < 8; i++) {
        const fieldKey = blockState.emptyFieldKeys[i]
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
    } else {
      emptyFieldTooltips.value = []
    }

    // Check if mouse is hovering over any visible circle
    hoveredCircle.value = getCircleAtPoint(
      ctx.mouseArtboard.x,
      ctx.mouseArtboard.y,
    )

    gl.useProgram(program.program)

    setUniforms(program, {
      u_circle_positions: circlePositions,
      u_circle_visible: circleVisible,
      u_color: toShaderColor(color.value),
      u_color_hover: toShaderColor(colorHover.value),
      u_color_field: toShaderColor(colorField.value),
      u_color_field_hover: toShaderColor(colorFieldHover.value),
      u_hovered_circle: hoveredCircle.value,
      u_radius: BUTTON_RADIUS,
      u_scale_transition: ctx.changeOptionsTransition,
    })
    animation.setSharedUniforms(gl, program)

    setBuffersAndAttributes(gl, program, bufferInfoCache)
    drawBufferInfo(gl, bufferInfoCache, gl.TRIANGLES)
  },
  renderFallback: (ctx, ctx2d) => {
    // Reset all circles to invisible
    circleVisible.fill(0)

    // Only render if exactly one block is selected
    if (ctx.selectedUuids.length !== 1) {
      return
    }

    const uuid = ctx.selectedUuids[0]
    if (!uuid) {
      return
    }

    // Get cached block state
    const blockState = getBlockState(uuid)

    // Check if we should show before/after buttons
    if (blockState.canShowBeforeAfter) {
      const blockRect = dom.getBlockRect(uuid)
      if (!blockRect || blockRect.width === 0) {
        return
      }

      // Get cached orientation
      const orientation = getOrientationForUuid(uuid)
      currentOrientation.value = orientation
      const BUTTON_SHIFT = 2 / ctx.artboardScale

      if (orientation === 'horizontal') {
        // Horizontal layout: buttons at left and right edges
        circlePositions[0] = blockRect.x - BUTTON_SHIFT
        circlePositions[1] = blockRect.y + blockRect.height / 2
        circleVisible[0] = 1

        circlePositions[2] = blockRect.x + blockRect.width + BUTTON_SHIFT
        circlePositions[3] = blockRect.y + blockRect.height / 2
        circleVisible[1] = 1
      } else {
        // Vertical layout: buttons at top and bottom edges
        circlePositions[0] = blockRect.x + blockRect.width / 2
        circlePositions[1] = blockRect.y - BUTTON_SHIFT
        circleVisible[0] = 1

        circlePositions[2] = blockRect.x + blockRect.width / 2
        circlePositions[3] = blockRect.y + blockRect.height + BUTTON_SHIFT
        circleVisible[1] = 1
      }
    }

    // Update tooltip data
    currentUuid.value = uuid
    currentBundleLabel.value = blockState.bundleLabel
    currentSingleAllowedBundleLabel.value = blockState.singleAllowedBundleLabel

    // Render empty field buttons (circles 2-9)
    if (blockState.emptyFieldKeys.length > 0) {
      emptyFieldTooltips.value = blockState.emptyFieldTooltips

      for (let i = 0; i < blockState.emptyFieldKeys.length && i < 8; i++) {
        const fieldKey = blockState.emptyFieldKeys[i]
        if (!fieldKey) {
          continue
        }

        const fieldRect = dom.getFieldRect(fieldKey)
        if (!fieldRect) {
          continue
        }

        const circleIndex = i + 2
        circlePositions[circleIndex * 2] = fieldRect.x + fieldRect.width / 2
        circlePositions[circleIndex * 2 + 1] =
          fieldRect.y + fieldRect.height / 2
        circleVisible[circleIndex] = 1
      }
    } else {
      emptyFieldTooltips.value = []
    }

    // Check if mouse is hovering over any visible circle
    hoveredCircle.value = getCircleAtPoint(
      ctx.mouseArtboard.x,
      ctx.mouseArtboard.y,
    )

    // Helper to convert RGB to CSS string
    const rgbToCss = (rgb: [number, number, number]) => {
      return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`
    }

    const borderWidth = 2 * ctx.dpi
    const radius = BUTTON_RADIUS * ctx.dpi * ctx.changeOptionsTransition
    const innerRadius = radius - borderWidth

    // Draw all visible circles
    for (let i = 0; i < MAX_CIRCLES; i++) {
      if (circleVisible[i]! <= 0) {
        continue
      }

      const artboardX = circlePositions[i * 2]!
      const artboardY = circlePositions[i * 2 + 1]!

      // Transform to viewport coordinates
      const viewportX =
        (artboardX * ctx.artboardScale + ctx.artboardOffset.x) * ctx.dpi
      const viewportY =
        (artboardY * ctx.artboardScale + ctx.artboardOffset.y) * ctx.dpi

      // Determine if this is a field button (circles 2-9)
      const isFieldButton = i >= 2

      // Determine color based on hover state
      const isHovered = hoveredCircle.value === i
      let fillColor: [number, number, number]
      if (isFieldButton) {
        fillColor = isHovered ? colorFieldHover.value : colorField.value
      } else {
        fillColor = isHovered ? colorHover.value : color.value
      }

      // 1. Draw colored circle with white border
      ctx2d.fillStyle = rgbToCss(fillColor)
      ctx2d.strokeStyle = 'rgb(255, 255, 255)'
      ctx2d.lineWidth = borderWidth
      ctx2d.beginPath()
      ctx2d.arc(viewportX, viewportY, radius, 0, Math.PI * 2)
      ctx2d.fill()
      ctx2d.stroke()

      // 2. Draw white plus sign
      const plusThickness = (ctx.dpi <= 0.5 ? 1.25 : 1.5) * ctx.dpi
      const plusLength = innerRadius * 0.5

      ctx2d.fillStyle = 'rgb(255, 255, 255)'

      // Horizontal bar
      ctx2d.fillRect(
        viewportX - plusLength,
        viewportY - plusThickness,
        plusLength * 2,
        plusThickness * 2,
      )

      // Vertical bar
      ctx2d.fillRect(
        viewportX - plusThickness,
        viewportY - plusLength,
        plusThickness * 2,
        plusLength * 2,
      )
    }
  },
})
</script>

<script lang="ts">
export default {
  name: 'AddButtonsRenderer',
}
</script>
