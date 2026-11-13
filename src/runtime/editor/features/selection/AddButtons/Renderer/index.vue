<template>
  <Teleport to="#bk-canvas-overlay">
    <!--
      Updated directly from the render loop, not through Vue: the text has to
      be there when the tooltip is measured, in the same frame.
    -->
    <div
      ref="tooltipEl"
      class="bk bk-add-button-tooltip"
      data-test="add-buttons-tooltip"
    />
  </Teleport>
</template>

<script lang="ts" setup>
import {
  useBlokkli,
  computed,
  useTemplateRef,
  onMounted,
  onBeforeUnmount,
} from '#imports'
import type { BufferInfo } from '#blokkli/editor/libraries/twgl'
import vertexSource from './vertex.glsl?raw'
import fragmentSource from './fragment.glsl?raw'
import { RectangleBufferCollector } from '#blokkli/editor/helpers/webgl'
import { rgbaToString, toShaderColor } from '#blokkli/editor/helpers/color'
import { defineRenderer, onBlokkliEvent } from '#blokkli/editor/composables'
import type { RenderContext } from '#blokkli/editor/providers/animation'
import type { Coord, Rectangle } from '#blokkli/editor/types/geometry'
import {
  BAND_OPACITY,
  MAX_SHAPES,
  TAB_DEPTH,
  TAB_FLARE,
  TAB_RADIUS,
  buildFrame,
  hitTest,
  isHorizontalEdge,
  placeLabel,
  type FieldInput,
  type Frame,
  type Shape,
  type ShapeType,
  type SiblingInput,
} from '../geometry'
import type {
  AddTarget,
  AddTargetId,
  AddTargets,
  FieldAddTarget,
  Side,
} from '../types'

const props = defineProps<{
  targets: AddTargets | null
  /**
   * The ends of the fields in proxy mode, whatever is selected: drawn in the
   * room their band leaves after the pages.
   */
  pagerTargets: FieldAddTarget[]
  activeTargetId: AddTargetId | null
}>()

const emit = defineEmits<{
  (e: 'activate', data: { id: AddTargetId; anchor: Coord }): void
}>()

const { animation, theme, dom, selection, ui } = useBlokkli()

// One source for the sizes the shaders use.
function injectConstants(source: string): string {
  return source
    .replace(/__MAX_SHAPES__/g, String(MAX_SHAPES))
    .replace(/__TAB_DEPTH__/g, TAB_DEPTH.toFixed(1))
    .replace(/__TAB_RADIUS__/g, TAB_RADIUS.toFixed(1))
    .replace(/__TAB_FLARE__/g, TAB_FLARE.toFixed(1))
    .replace(/__BAND_OPACITY__/g, BAND_OPACITY.toFixed(2))
}
const vs = injectConstants(vertexSource)
const fs = injectConstants(fragmentSource)

const SHAPE_TYPES: Record<ShapeType, number> = {
  tab: 1,
  knob: 2,
  band: 3,
  bar: 4,
  outline: 5,
  area: 6,
}

const SIDES: Record<Side, number> = { top: 0, right: 1, bottom: 2, left: 3 }

const shapeRects = new Float32Array(MAX_SHAPES * 4)
const shapeStyles = new Float32Array(MAX_SHAPES * 4)

const colors = computed(() => ({
  accent: theme.accent.value[600],
  accentHover: theme.accent.value[500],
  line: theme.accent.value[500],
  tint: theme.accent.value[50],
}))

const shaderColors = computed(() => ({
  u_color_accent: toShaderColor(colors.value.accent),
  u_color_accent_hover: toShaderColor(colors.value.accentHover),
  u_color_line: toShaderColor(colors.value.line),
  u_color_tint: toShaderColor(colors.value.tint),
}))

// The last interaction was a touch: then there's no hover, and all filled
// fields show their end bar.
let isTouch = !!window.matchMedia?.('(hover: none)').matches

function onPointerUp(e: PointerEvent) {
  isTouch = e.pointerType === 'touch'
}

function onPointerMove(e: PointerEvent) {
  if (e.pointerType === 'mouse') {
    isTouch = false
  }
}

onMounted(() => {
  window.addEventListener('pointerup', onPointerUp, {
    capture: true,
    passive: true,
  })
  window.addEventListener('pointermove', onPointerMove, {
    capture: true,
    passive: true,
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('pointerup', onPointerUp, { capture: true })
  window.removeEventListener('pointermove', onPointerMove, { capture: true })
})

const tooltipEl = useTemplateRef<HTMLDivElement>('tooltipEl')

let tooltipTransform = ''
let isTooltipShown = false

let lastFrame: Frame | null = null
let lastRenderTime = -1
let bufferInfo: BufferInfo | null = null

// The targets and block size the field rects were last measured for.
let measuredTargets: AddTargets | null = null
let measuredBlockTime = 0

function isEnabled(): boolean {
  return (
    (!!props.targets || props.pagerTargets.length > 0) &&
    !selection.isDragging.value &&
    !selection.isMultiSelecting.value &&
    !selection.activeFieldLabel.value &&
    !ui.isAnimating.value &&
    !ui.hasTransformOverlayOpen.value &&
    !ui.isApproving.value &&
    (!ui.openTooltip.value || ui.openTooltip.value === 'add-buttons')
  )
}

function toScreen(rect: Rectangle, scale: number, offset: Coord): Rectangle {
  return {
    x: rect.x * scale + offset.x,
    y: rect.y * scale + offset.y,
    width: rect.width * scale,
    height: rect.height * scale,
  }
}

function getRenderedRect(uuid: string | undefined): Rectangle | null {
  if (!uuid) {
    return null
  }
  const rect = dom.getBlockRect(uuid)
  return rect && rect.width > 0 ? rect : null
}

/**
 * The nearest rendered block before or after an index: a block can be hidden,
 * e.g. by its options.
 */
function findRenderedSibling(
  uuids: string[],
  index: number,
  step: -1 | 1,
): Rectangle | null {
  if (index < 0) {
    return null
  }
  for (let i = index + step; i >= 0 && i < uuids.length; i += step) {
    const rect = getRenderedRect(uuids[i])
    if (rect) {
      return rect
    }
  }
  return null
}

/**
 * The last two rendered blocks of a field, the last one first.
 */
function findLastRendered(
  uuids: string[],
): [Rectangle | null, Rectangle | null] {
  let last: Rectangle | null = null
  for (let i = uuids.length - 1; i >= 0; i--) {
    const rect = getRenderedRect(uuids[i])
    if (!rect) {
      continue
    }
    if (last) {
      return [last, rect]
    }
    last = rect
  }
  return [last, null]
}

/**
 * Field rects aren't observed for size changes: measure the fields again when
 * the selection, the state or the size of the selected block changed.
 */
function refreshFieldRects(targets: AddTargets) {
  const blockTime = targets.uuid
    ? (dom.getBlockRect(targets.uuid)?.time ?? 0)
    : 0
  if (targets === measuredTargets && blockTime === measuredBlockTime) {
    return
  }
  measuredTargets = targets
  measuredBlockTime = blockTime
  for (const target of targets.list) {
    if (target.kind === 'field') {
      dom.refreshFieldRect(target.field.key)
    }
  }
}

function getFrame(ctx: RenderContext): Frame | null {
  const scale = ctx.artboardScale
  const offset = ctx.artboardOffset

  const fields: FieldInput[] = []
  let siblings: SiblingInput | null = null

  // The selection's targets, while the selected block is rendered.
  const targets = props.targets
  const block = targets?.uuid ? getRenderedRect(targets.uuid) : null
  if (targets && (!targets.uuid || block)) {
    refreshFieldRects(targets)
    siblings = getSiblingInput(targets, block, scale, offset)
    fields.push(...getFieldInputs(targets, scale, offset))
  }

  for (const target of props.pagerTargets) {
    if (!dom.isFieldVisible(target.field.key)) {
      continue
    }
    const rect = dom.getAddAreaRect(target.field.key)
    if (!rect) {
      continue
    }
    // Drawn as an empty field is: the area, with its knob in the middle.
    fields.push({
      id: target.id,
      rect: toScreen(rect, scale, offset),
      isEmpty: true,
      flow: target.flow,
      last: null,
      secondLast: null,
    })
  }

  if (!siblings && !fields.length) {
    return null
  }

  return buildFrame({
    scale,
    transition: ctx.changeOptionsTransition,
    pointer: { x: ctx.mouseX, y: ctx.mouseY },
    isTouch,
    viewport: ui.visibleViewport.value,
    activeId: props.activeTargetId,
    siblings,
    fields,
  })
}

/**
 * The before/after tabs of the selected block, if its field can take another
 * block.
 */
function getSiblingInput(
  targets: AddTargets,
  block: Rectangle | null,
  scale: number,
  offset: Coord,
): SiblingInput | null {
  const screen = (rect: Rectangle | null) =>
    rect ? toScreen(rect, scale, offset) : null

  let siblings: SiblingInput | null = null
  if (targets.uuid && block) {
    const sibling = targets.list.find((target) => target.kind === 'before')
    if (sibling) {
      // The pages above the block that a field in proxy mode shows aren't its
      // neighbours: the sides come from the band's flow, left and right.
      const isPager = sibling.field.isPager
      const index = targets.siblingUuids.indexOf(targets.uuid)
      siblings = {
        block: toScreen(block, scale, offset),
        prev: isPager
          ? null
          : screen(findRenderedSibling(targets.siblingUuids, index, -1)),
        next: isPager
          ? null
          : screen(findRenderedSibling(targets.siblingUuids, index, 1)),
        flow: sibling.flow,
      }
    }
  }
  return siblings
}

/**
 * The ends of the selected block's fields, or of the host's.
 */
function getFieldInputs(
  targets: AddTargets,
  scale: number,
  offset: Coord,
): FieldInput[] {
  const screen = (rect: Rectangle | null) =>
    rect ? toScreen(rect, scale, offset) : null

  const fields: FieldInput[] = []
  for (const target of targets.list) {
    if (target.kind !== 'field' || !dom.isFieldVisible(target.field.key)) {
      continue
    }
    const rect = dom.getFieldRect(target.field.key)
    if (!rect) {
      continue
    }
    const [last, secondLast] = target.isEmpty
      ? [null, null]
      : findLastRendered(target.childUuids)
    fields.push({
      id: target.id,
      rect: toScreen(rect, scale, offset),
      isEmpty: target.isEmpty,
      flow: target.flow,
      last: screen(last),
      secondLast: screen(secondLast),
    })
  }
  return fields
}

function moveElement(
  el: HTMLElement | null,
  position: Coord,
  previous: string,
): string {
  const transform = `translate(${Math.round(position.x)}px, ${Math.round(position.y)}px)`
  if (el && transform !== previous) {
    el.style.transform = transform
  }
  return transform
}

/**
 * Show and place the tooltip of the button under the pointer. Its text is set
 * right away, so that it can be measured in the same frame.
 */
function updateTooltip(frame: Frame | null) {
  const el = tooltipEl.value
  const request = frame?.tooltip
  const target: AddTarget | undefined = request
    ? (props.targets?.list.find((v) => v.id === request.targetId) ??
      props.pagerTargets.find((v) => v.id === request.targetId))
    : undefined

  if (!el || !request || !target) {
    el?.classList.remove('bk-is-visible')
    isTooltipShown = false
    return
  }

  if (el.textContent !== target.label) {
    el.textContent = target.label
  }
  el.classList.toggle('bk-is-field', target.kind === 'field')
  el.classList.add('bk-is-visible')
  el.dataset.testTarget = target.id
  tooltipTransform = moveElement(
    el,
    placeLabel(
      request.anchor,
      { width: el.offsetWidth, height: el.offsetHeight },
      request.side,
      8,
      ui.visibleViewportPadded.value,
    ),
    tooltipTransform,
  )
  isTooltipShown = true
}

function startFrame(ctx: RenderContext): Frame | null {
  lastRenderTime = ctx.time
  lastFrame = getFrame(ctx)
  updateTooltip(lastFrame)
  return lastFrame
}

function packShapes(shapes: Shape[]) {
  shapeStyles.fill(0)
  for (let i = 0; i < shapes.length; i++) {
    const shape = shapes[i]!
    const offset = i * 4
    shapeRects[offset] = shape.rect.x
    shapeRects[offset + 1] = shape.rect.y
    shapeRects[offset + 2] = shape.rect.width
    shapeRects[offset + 3] = shape.rect.height
    shapeStyles[offset] = SHAPE_TYPES[shape.type]
    shapeStyles[offset + 1] = SIDES[shape.side]
    shapeStyles[offset + 2] = shape.hovered ? 1 : 0
    shapeStyles[offset + 3] = shape.alpha
  }
}

function drawPlus(
  ctx2d: CanvasRenderingContext2D,
  center: Coord,
  arm: number,
  thickness: number,
) {
  ctx2d.fillRect(center.x - arm, center.y - thickness / 2, arm * 2, thickness)
  ctx2d.fillRect(center.x - thickness / 2, center.y - arm, thickness, arm * 2)
}

function drawDashedBox(
  ctx2d: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  dpi: number,
  alpha: number,
) {
  const inset = 1 * dpi
  ctx2d.strokeStyle = rgbaToString(colors.value.line, alpha)
  ctx2d.lineWidth = 1.5 * dpi
  ctx2d.setLineDash([6 * dpi, 4 * dpi])
  ctx2d.beginPath()
  ctx2d.roundRect(
    x + inset,
    y + inset,
    width - inset * 2,
    height - inset * 2,
    3 * dpi,
  )
  ctx2d.stroke()
}

/**
 * Draw a shape on the 2D canvas, like the shaders do.
 */
function drawShape2d(
  ctx2d: CanvasRenderingContext2D,
  shape: Shape,
  dpi: number,
) {
  const x = shape.rect.x * dpi
  const y = shape.rect.y * dpi
  const width = shape.rect.width * dpi
  const height = shape.rect.height * dpi
  const center = { x: x + width / 2, y: y + height / 2 }

  ctx2d.save()
  ctx2d.globalAlpha = shape.alpha

  switch (shape.type) {
    case 'tab': {
      // Drawn like a tab pointing up from the middle of its flat side, then
      // turned to its side.
      const horizontal = isHorizontalEdge(shape.side)
      const length = horizontal ? width : height
      const depth = horizontal ? height : width
      const scale = depth / (TAB_DEPTH * dpi)
      const flare = TAB_FLARE * dpi * scale
      const radius = TAB_RADIUS * dpi * scale
      const half = length / 2 - flare
      const base = {
        top: { x: center.x, y: y + height, angle: 0 },
        bottom: { x: center.x, y, angle: Math.PI },
        left: { x: x + width, y: center.y, angle: -Math.PI / 2 },
        right: { x, y: center.y, angle: Math.PI / 2 },
      }[shape.side]
      ctx2d.translate(base.x, base.y)
      ctx2d.rotate(base.angle)
      ctx2d.fillStyle = rgbaToString(
        shape.hovered ? colors.value.accentHover : colors.value.accent,
      )
      ctx2d.beginPath()
      ctx2d.moveTo(-half - flare, 0)
      ctx2d.arc(-half - flare, -flare, flare, Math.PI / 2, 0, true)
      ctx2d.lineTo(-half, -depth + radius)
      ctx2d.arcTo(-half, -depth, -half + radius, -depth, radius)
      ctx2d.lineTo(half - radius, -depth)
      ctx2d.arcTo(half, -depth, half, -depth + radius, radius)
      ctx2d.lineTo(half, -flare)
      ctx2d.arc(half + flare, -flare, flare, Math.PI, Math.PI / 2, true)
      ctx2d.closePath()
      ctx2d.fill()
      ctx2d.fillStyle = 'white'
      drawPlus(ctx2d, { x: 0, y: -depth / 2 }, depth * 0.28, 2 * dpi)
      break
    }

    case 'knob': {
      const radius = Math.min(width, height) / 2
      ctx2d.fillStyle = shape.hovered
        ? rgbaToString(colors.value.tint)
        : 'white'
      ctx2d.beginPath()
      ctx2d.arc(center.x, center.y, radius, 0, Math.PI * 2)
      ctx2d.fill()
      ctx2d.strokeStyle = rgbaToString(colors.value.accent)
      ctx2d.lineWidth = 2 * dpi
      ctx2d.beginPath()
      ctx2d.arc(center.x, center.y, Math.max(radius - dpi, 0), 0, Math.PI * 2)
      ctx2d.stroke()
      ctx2d.fillStyle = rgbaToString(colors.value.accent)
      drawPlus(ctx2d, center, radius * 0.45, 2 * dpi)
      break
    }

    case 'band':
      ctx2d.fillStyle = rgbaToString(colors.value.accent, BAND_OPACITY)
      ctx2d.beginPath()
      ctx2d.roundRect(x, y, width, height, 2 * dpi)
      ctx2d.fill()
      break

    case 'bar': {
      if (!shape.hovered) {
        ctx2d.globalAlpha = shape.alpha * 0.75
      }
      const halo = 1.5 * dpi
      ctx2d.fillStyle = 'white'
      ctx2d.beginPath()
      ctx2d.roundRect(
        x - halo,
        y - halo,
        width + halo * 2,
        height + halo * 2,
        2 * dpi + halo,
      )
      ctx2d.fill()
      ctx2d.fillStyle = rgbaToString(colors.value.line)
      ctx2d.beginPath()
      ctx2d.roundRect(x, y, width, height, 2 * dpi)
      ctx2d.fill()
      break
    }

    case 'outline':
      drawDashedBox(ctx2d, x, y, width, height, dpi, 0.8)
      break

    case 'area':
      ctx2d.fillStyle = rgbaToString(
        colors.value.line,
        shape.hovered ? 0.14 : 0.07,
      )
      ctx2d.beginPath()
      ctx2d.roundRect(x, y, width, height, 3 * dpi)
      ctx2d.fill()
      drawDashedBox(ctx2d, x, y, width, height, dpi, shape.hovered ? 0.9 : 0.6)
      break
  }

  ctx2d.restore()
}

// The renderer isn't called while it's disabled: hide the tooltip then.
onBlokkliEvent('canvas:draw', (e) => {
  if (e.time !== lastRenderTime && (lastFrame || isTooltipShown)) {
    lastFrame = null
    updateTooltip(null)
  }
})

const { collector } = await defineRenderer('add-buttons', {
  zIndex: 1000,
  collector: () => {
    const c = new RectangleBufferCollector()
    // A placeholder quad per shape: the shaders place them.
    for (let i = 0; i < MAX_SHAPES; i++) {
      c.addRectangle({ id: `shape-${i}`, x: 0, y: 0, width: 1, height: 1 }, 0)
    }
    return c
  },
  program: () => ({ shaders: [vs, fs] }),
  enabled: isEnabled,
  cursor: () => (lastFrame?.pointerId ? 'pointer' : null),
  onClick: ({ mouse }) => {
    const frame = lastFrame
    if (!frame) {
      return false
    }
    const zone = hitTest(frame.zones, mouse, isTouch ? 8 : 2)
    const anchor = zone ? frame.anchors.get(zone.targetId) : undefined
    if (!zone || !anchor) {
      return false
    }
    emit('activate', {
      id: zone.targetId,
      anchor: ui.toArtboardCoords(anchor),
    })
    return true
  },
  render: (ctx, gl, program, twgl) => {
    const frame = startFrame(ctx)
    if (!frame?.shapes.length) {
      return
    }

    bufferInfo ||= collector.createBufferInfo(gl, twgl)
    packShapes(frame.shapes)

    gl.useProgram(program.program)
    twgl.setUniforms(program, {
      u_shape_rect: shapeRects,
      u_shape_style: shapeStyles,
      ...shaderColors.value,
    })
    animation.setSharedUniforms(gl, program)
    twgl.setBuffersAndAttributes(gl, program, bufferInfo)
    twgl.drawBufferInfo(gl, bufferInfo, gl.TRIANGLES)
  },
  renderFallback: (ctx, ctx2d) => {
    const frame = startFrame(ctx)
    if (!frame) {
      return
    }
    // The 2D canvas paints the bottom shape first.
    for (let i = frame.shapes.length - 1; i >= 0; i--) {
      drawShape2d(ctx2d, frame.shapes[i]!, ctx.dpi)
    }
  },
})
</script>

<script lang="ts">
export default {
  name: 'AddButtonsRenderer',
}
</script>

<style lang="postcss">
.bk.bk-add-button-tooltip {
  @apply fixed left-0 top-0 whitespace-nowrap pointer-events-none invisible;
  @apply bg-accent-600 font-semibold text-white rounded-full px-10 text-sm leading-none;
  @apply will-change-transform;
  @apply h-30;
  @apply border-2 border-white flex items-center justify-center;
  @apply z-add-buttons-label;

  /* Adding inside a field: outlined, like its knob. */
  &.bk-is-field {
    @apply bg-white text-accent-700 border-accent-500;
  }

  &.bk-is-visible {
    @apply visible;
  }
}
</style>
