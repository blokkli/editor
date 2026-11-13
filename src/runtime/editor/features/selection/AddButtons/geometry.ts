/**
 * Geometry of the add buttons: where the tabs, end bars and knobs go, which
 * one is under the pointer, and where their labels go.
 *
 * Everything here is in screen pixels and free of DOM access, so that the
 * renderer only has to measure rectangles and draw what this module returns.
 */
import type { ChildrenFlow } from '#blokkli/editor/helpers/dropTargets'
import type { Coord, Rectangle, Size } from '#blokkli/editor/types/geometry'
import type { AddTargetId, Side } from './types'

/** The width of a before/after tab's body, along the edge. */
export const TAB_WIDTH = 30

/** The concave curves on both sides where a tab meets the edge. */
export const TAB_FLARE = 4

/** The radius of a tab's outer corners. */
export const TAB_RADIUS = 6

/** The size of a before/after tab along the edge, with its curves. */
export const TAB_LENGTH = TAB_WIDTH + TAB_FLARE * 2

/** How far a before/after tab reaches out from the edge. */
export const TAB_DEPTH = 18

/**
 * The depth of the band behind a hovered tab: about 75% of the tab's, so that
 * the band stays within the tab's reach.
 */
export const BAND_DEPTH = Math.round(TAB_DEPTH * 0.75)

/** The opacity of the band behind a hovered tab. */
export const BAND_OPACITY = 0.3

/** The diameter of a knob. */
export const KNOB_SIZE = 22

/** The smallest diameter of a knob, in thin fields. */
export const KNOB_MIN_SIZE = 16

/** The thickness of an end bar. */
export const BAR_THICKNESS = 4

/** The deepest an end bar's hit band reaches into the field. */
export const BAR_BAND = 10

/** The most shapes drawn at once: the size of the shader's uniform arrays. */
export const MAX_SHAPES = 48

/** How far outside the viewport shapes are still drawn. */
const CULL_MARGIN = 20

export type ShapeType = 'tab' | 'band' | 'knob' | 'bar' | 'outline' | 'area'

export type Shape = {
  type: ShapeType
  targetId: AddTargetId

  rect: Rectangle

  /**
   * For a tab, the side it points to. For a band or a bar, the edge it runs
   * along (top/bottom: horizontal).
   */
  side: Side

  hovered: boolean

  /** From 0 to 1: the zoom fade and the scale-in after changing options. */
  alpha: number
}

export type HitZoneKind = 'tab' | 'knob' | 'bar' | 'area'

export type HitZone = {
  targetId: AddTargetId
  kind: HitZoneKind
  rect: Rectangle

  /** For a knob: it's hit within this distance from its centre. */
  radius?: number
}

/** Where to show the tooltip of a button. */
export type TooltipRequest = {
  targetId: AddTargetId
  anchor: Coord
  side: Side
}

export type SiblingInput = {
  /** The selected block. */
  block: Rectangle

  /** The nearest block before it in its field that is rendered. */
  prev: Rectangle | null

  /** The nearest block after it in its field that is rendered. */
  next: Rectangle | null

  /** How the blocks of its field are laid out. */
  flow: ChildrenFlow
}

export type FieldInput = {
  id: AddTargetId
  rect: Rectangle
  isEmpty: boolean
  flow: ChildrenFlow

  /** The last rendered block of the field. */
  last: Rectangle | null

  /** The rendered block before the last one. */
  secondLast: Rectangle | null
}

export type FrameInput = {
  /** The artboard's scale. */
  scale: number

  /** From 0 to 1: the scale-in after changing options. */
  transition: number

  pointer: Coord | null

  /** The last interaction was a touch: there is no hover. */
  isTouch: boolean

  /** The visible part of the artboard. */
  viewport: Rectangle

  /** The target whose bundle selector is open. */
  activeId: AddTargetId | null

  /** Null when the selected block can't get siblings, or the host is selected. */
  siblings: SiblingInput | null

  fields: FieldInput[]
}

export type Frame = {
  /** The shapes to draw, the topmost first. */
  shapes: Shape[]

  zones: HitZone[]

  /** The highlighted target: the one of the open selector, else under the pointer. */
  hoveredId: AddTargetId | null

  /** The target under the pointer. */
  pointerId: AddTargetId | null

  /** Where the bundle selector of each target is anchored. */
  anchors: Map<AddTargetId, Coord>

  tooltip: TooltipRequest | null
}

const OPPOSITE: Record<Side, Side> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
}

const HIT_PRIORITY: Record<HitZoneKind, number> = {
  tab: 0,
  knob: 1,
  bar: 2,
  area: 3,
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

export function opposite(side: Side): Side {
  return OPPOSITE[side]
}

/**
 * Whether the edge on this side runs horizontally.
 */
export function isHorizontalEdge(side: Side): boolean {
  return side === 'top' || side === 'bottom'
}

function getCenter(rect: Rectangle): Coord {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
}

function contains(rect: Rectangle, point: Coord, slop = 0): boolean {
  return (
    point.x >= rect.x - slop &&
    point.x <= rect.x + rect.width + slop &&
    point.y >= rect.y - slop &&
    point.y <= rect.y + rect.height + slop
  )
}

function intersects(a: Rectangle, b: Rectangle): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  )
}

function expand(rect: Rectangle, by: number): Rectangle {
  return {
    x: rect.x - by,
    y: rect.y - by,
    width: rect.width + by * 2,
    height: rect.height + by * 2,
  }
}

function circleRect(center: Coord, radius: number): Rectangle {
  return {
    x: center.x - radius,
    y: center.y - radius,
    width: radius * 2,
    height: radius * 2,
  }
}

/**
 * The point on a circle in the direction of a side.
 */
function pointTowards(center: Coord, distance: number, side: Side): Coord {
  switch (side) {
    case 'top':
      return { x: center.x, y: center.y - distance }
    case 'bottom':
      return { x: center.x, y: center.y + distance }
    case 'left':
      return { x: center.x - distance, y: center.y }
    case 'right':
      return { x: center.x + distance, y: center.y }
  }
}

/**
 * The centre of the visible part of a span, kept far enough from its ends for
 * an item of the given length to stay on the span.
 */
function centerAlong(
  start: number,
  size: number,
  viewStart: number,
  viewSize: number,
  length: number,
): number {
  if (size <= length) {
    return start + size / 2
  }
  const visibleStart = Math.max(start, viewStart)
  const visibleEnd = Math.min(start + size, viewStart + viewSize)
  const center =
    visibleEnd > visibleStart
      ? (visibleStart + visibleEnd) / 2
      : start + size / 2
  return clamp(center, start + length / 2, start + size - length / 2)
}

/**
 * The centre of the visible part of a rectangle.
 */
function getVisibleCenter(rect: Rectangle, viewport: Rectangle): Coord {
  return {
    x: centerAlong(rect.x, rect.width, viewport.x, viewport.width, 0),
    y: centerAlong(rect.y, rect.height, viewport.y, viewport.height, 0),
  }
}

/**
 * The opacity of the buttons at the given artboard scale: they fade out
 * between 0.5 and 0.4.
 */
export function getFade(scale: number): number {
  // Written this way to be exactly 1 at 0.5: (0.5 - 0.4) / 0.1 is not.
  return clamp(scale * 10 - 4, 0, 1)
}

/**
 * How far the selection outline reaches out from the block, mirroring the
 * selection renderer's shaders.
 */
export function getSelectionOutlineWidth(scale: number): number {
  return 2 * (0.5 + smoothstep(0.3, 1, scale) * 2.5)
}

/**
 * How far a tab's flat side is from the block: on the outer edge of the
 * selection outline, overlapping it by a pixel so that the tab is attached.
 */
export function getTabOffset(scale: number): number {
  return Math.max(getSelectionOutlineWidth(scale) - 1, 0)
}

/**
 * On which side of a block another block is: in the same row, left or right;
 * in the same column, above or below. Null when it's neither, such as the next
 * item of a grid that wrapped to a new row, or blocks that overlap.
 */
export function getNeighbourSide(
  block: Rectangle,
  neighbour: Rectangle,
): Side | null {
  const overlapX =
    Math.min(block.x + block.width, neighbour.x + neighbour.width) -
    Math.max(block.x, neighbour.x)
  const overlapY =
    Math.min(block.y + block.height, neighbour.y + neighbour.height) -
    Math.max(block.y, neighbour.y)
  const minWidth = Math.min(block.width, neighbour.width)
  const minHeight = Math.min(block.height, neighbour.height)
  const blockCenter = getCenter(block)
  const neighbourCenter = getCenter(neighbour)

  if (overlapY >= minHeight * 0.5 && overlapX <= minWidth * 0.25) {
    return neighbourCenter.x < blockCenter.x ? 'left' : 'right'
  }

  if (overlapX >= minWidth * 0.5 && overlapY <= minHeight * 0.25) {
    return neighbourCenter.y < blockCenter.y ? 'top' : 'bottom'
  }

  return null
}

/**
 * The sides of before and after when there are no neighbours: from how the
 * field lays out its children.
 */
export function getFlowSides(flow: ChildrenFlow): {
  before: Side
  after: Side
} {
  if (flow.orientation === 'vertical') {
    return flow.reversed
      ? { before: 'bottom', after: 'top' }
      : { before: 'top', after: 'bottom' }
  }

  // Right to left and a reversed row cancel each other out.
  return flow.rtl !== flow.reversed
    ? { before: 'right', after: 'left' }
    : { before: 'left', after: 'right' }
}

/**
 * The sides of the selected block where a new block before and after it will
 * appear: from where its neighbours really are, so that right-to-left,
 * reversed and reordered layouts point the right way.
 */
export function getBeforeAfterSides(
  block: Rectangle,
  prev: Rectangle | null,
  next: Rectangle | null,
  flow: ChildrenFlow,
): { before: Side; after: Side } {
  const before = prev ? getNeighbourSide(block, prev) : null
  const after = next ? getNeighbourSide(block, next) : null

  if (before && after) {
    return {
      before,
      after: after === before ? opposite(before) : after,
    }
  }

  if (before) {
    return { before, after: opposite(before) }
  }

  if (after) {
    return { before: opposite(after), after }
  }

  return getFlowSides(flow)
}

/**
 * The side of a field where its next block will appear: past its last block.
 */
export function getFieldEndSide(
  last: Rectangle | null,
  secondLast: Rectangle | null,
  flow: ChildrenFlow,
): Side {
  if (last && secondLast) {
    const side = getNeighbourSide(last, secondLast)
    if (side) {
      return opposite(side)
    }
  }

  return getFlowSides(flow).after
}

/**
 * The before/after tab: outside the selection outline, centred on the visible
 * part of the edge. It scales from the middle of its flat side.
 *
 * @param k - The scale of the tab, from 0 to 1.
 */
export function getTabRect(
  block: Rectangle,
  side: Side,
  scale: number,
  k: number,
  viewport: Rectangle,
): Rectangle {
  const length = TAB_LENGTH * k
  const depth = TAB_DEPTH * k
  const offset = getTabOffset(scale)

  // On whole pixels, so that the plus is sharp and centred.
  if (isHorizontalEdge(side)) {
    const x =
      centerAlong(block.x, block.width, viewport.x, viewport.width, length) -
      length / 2
    const y =
      side === 'top'
        ? block.y - offset - depth
        : block.y + block.height + offset
    return { x: Math.round(x), y: Math.round(y), width: length, height: depth }
  }

  const y =
    centerAlong(block.y, block.height, viewport.y, viewport.height, length) -
    length / 2
  const x =
    side === 'left' ? block.x - offset - depth : block.x + block.width + offset
  return { x: Math.round(x), y: Math.round(y), width: depth, height: length }
}

/**
 * A point on whole pixels, so that a knob's plus is sharp and centred.
 */
function snap(point: Coord): Coord {
  return { x: Math.round(point.x), y: Math.round(point.y) }
}

/**
 * The band shown behind a hovered tab, along the whole edge the block is added
 * at. Like the tab, it starts on the selection outline (on the same whole
 * pixel); it isn't as deep, so it never reaches beyond the tab, e.g. into the
 * toolbar above the block.
 */
export function getBandRect(
  block: Rectangle,
  side: Side,
  scale: number,
): Rectangle {
  const offset = getTabOffset(scale)
  switch (side) {
    case 'top':
      return {
        x: block.x,
        y: Math.round(block.y - offset) - BAND_DEPTH,
        width: block.width,
        height: BAND_DEPTH,
      }
    case 'bottom':
      return {
        x: block.x,
        y: Math.round(block.y + block.height + offset),
        width: block.width,
        height: BAND_DEPTH,
      }
    case 'left':
      return {
        x: Math.round(block.x - offset) - BAND_DEPTH,
        y: block.y,
        width: BAND_DEPTH,
        height: block.height,
      }
    case 'right':
      return {
        x: Math.round(block.x + block.width + offset),
        y: block.y,
        width: BAND_DEPTH,
        height: block.height,
      }
  }
}

/**
 * The radius of a knob in a field: smaller in thin fields.
 */
export function getKnobRadius(fieldDepth: number, k: number): number {
  return clamp(fieldDepth / 2, KNOB_MIN_SIZE / 2, KNOB_SIZE / 2) * k
}

/**
 * The end bar of a filled field: a thin bar inside the field along its end,
 * its hit band, and the knob on the bar's inner side.
 *
 * The band reaches at most 40% into the last block, so that a small block
 * stays clickable.
 */
export function getEndBar(
  field: Rectangle,
  side: Side,
  last: Rectangle | null,
  k: number,
  viewport: Rectangle,
): { bar: Rectangle; band: Rectangle; knob: Coord; radius: number } {
  const result = getEndBarUnsnapped(field, side, last, k, viewport)
  return { ...result, knob: snap(result.knob) }
}

function getEndBarUnsnapped(
  field: Rectangle,
  side: Side,
  last: Rectangle | null,
  k: number,
  viewport: Rectangle,
): { bar: Rectangle; band: Rectangle; knob: Coord; radius: number } {
  const horizontal = isHorizontalEdge(side)
  const lastDepth = last ? (horizontal ? last.height : last.width) : Infinity
  const band = Math.max(BAR_THICKNESS, Math.min(BAR_BAND, lastDepth * 0.4))
  const radius = getKnobRadius(horizontal ? field.height : field.width, k)

  if (horizontal) {
    const knobX = centerAlong(
      field.x,
      field.width,
      viewport.x,
      viewport.width,
      radius * 2,
    )
    if (side === 'bottom') {
      const edge = field.y + field.height
      return {
        bar: {
          x: field.x,
          y: edge - BAR_THICKNESS,
          width: field.width,
          height: BAR_THICKNESS,
        },
        band: { x: field.x, y: edge - band, width: field.width, height: band },
        knob: { x: knobX, y: edge - radius },
        radius,
      }
    }
    return {
      bar: {
        x: field.x,
        y: field.y,
        width: field.width,
        height: BAR_THICKNESS,
      },
      band: { x: field.x, y: field.y, width: field.width, height: band },
      knob: { x: knobX, y: field.y + radius },
      radius,
    }
  }

  const knobY = centerAlong(
    field.y,
    field.height,
    viewport.y,
    viewport.height,
    radius * 2,
  )
  if (side === 'right') {
    const edge = field.x + field.width
    return {
      bar: {
        x: edge - BAR_THICKNESS,
        y: field.y,
        width: BAR_THICKNESS,
        height: field.height,
      },
      band: { x: edge - band, y: field.y, width: band, height: field.height },
      knob: { x: edge - radius, y: knobY },
      radius,
    }
  }
  return {
    bar: {
      x: field.x,
      y: field.y,
      width: BAR_THICKNESS,
      height: field.height,
    },
    band: { x: field.x, y: field.y, width: band, height: field.height },
    knob: { x: field.x + radius, y: knobY },
    radius,
  }
}

/**
 * Which filled fields show their end bar: with a mouse, the smallest field
 * under the pointer; on touch, all of them. The field whose bundle selector
 * is open always does.
 *
 * @returns The fields that show their bar, and the one under the pointer.
 */
export function getRevealedFields(
  fields: FieldInput[],
  pointer: Coord | null,
  isTouch: boolean,
  activeId: AddTargetId | null,
): { ids: Set<AddTargetId>; underPointer: AddTargetId | null } {
  const ids = new Set<AddTargetId>()
  let underPointer: FieldInput | null = null

  for (const field of fields) {
    if (field.isEmpty) {
      continue
    }
    if (isTouch || field.id === activeId) {
      ids.add(field.id)
    }
    if (
      !isTouch &&
      pointer &&
      contains(field.rect, pointer) &&
      (!underPointer ||
        field.rect.width * field.rect.height <
          underPointer.rect.width * underPointer.rect.height)
    ) {
      underPointer = field
    }
  }

  if (underPointer) {
    ids.add(underPointer.id)
  }

  return { ids, underPointer: underPointer?.id ?? null }
}

/**
 * The hit zone under a point: tabs before knobs before bars before empty
 * areas, and the nearest one of the same kind.
 *
 * @param slop - How far outside a zone still counts.
 */
export function hitTest(
  zones: HitZone[],
  point: Coord,
  slop = 0,
): HitZone | null {
  let best: HitZone | null = null
  let bestPriority = Infinity
  let bestDistance = Infinity

  for (const zone of zones) {
    const center = getCenter(zone.rect)
    const distance = Math.hypot(point.x - center.x, point.y - center.y)
    const isHit =
      zone.radius !== undefined
        ? distance <= zone.radius + slop
        : contains(zone.rect, point, slop)
    if (!isHit) {
      continue
    }
    const priority = HIT_PRIORITY[zone.kind]
    if (
      priority < bestPriority ||
      (priority === bestPriority && distance < bestDistance)
    ) {
      best = zone
      bestPriority = priority
      bestDistance = distance
    }
  }

  return best
}

/**
 * Place a label next to an anchor point: on the given side, on the opposite
 * side when it doesn't fit there, and kept within the bounds.
 *
 * @returns The top left corner of the label.
 */
export function placeLabel(
  anchor: Coord,
  size: Size,
  side: Side,
  gap: number,
  bounds: Rectangle,
): Coord {
  const positionFor = (s: Side): Coord => {
    switch (s) {
      case 'top':
        return {
          x: anchor.x - size.width / 2,
          y: anchor.y - gap - size.height,
        }
      case 'bottom':
        return { x: anchor.x - size.width / 2, y: anchor.y + gap }
      case 'left':
        return {
          x: anchor.x - gap - size.width,
          y: anchor.y - size.height / 2,
        }
      case 'right':
        return { x: anchor.x + gap, y: anchor.y - size.height / 2 }
    }
  }

  const fits = (s: Side): boolean => {
    const p = positionFor(s)
    switch (s) {
      case 'top':
        return p.y >= bounds.y
      case 'bottom':
        return p.y + size.height <= bounds.y + bounds.height
      case 'left':
        return p.x >= bounds.x
      case 'right':
        return p.x + size.width <= bounds.x + bounds.width
    }
  }

  const finalSide = !fits(side) && fits(opposite(side)) ? opposite(side) : side
  const position = positionFor(finalSide)

  return {
    x: Math.max(
      bounds.x,
      Math.min(position.x, bounds.x + bounds.width - size.width),
    ),
    y: Math.max(
      bounds.y,
      Math.min(position.y, bounds.y + bounds.height - size.height),
    ),
  }
}

function hoveredFirst(shapes: Shape[]): Shape[] {
  return [
    ...shapes.filter((shape) => shape.hovered),
    ...shapes.filter((shape) => !shape.hovered),
  ]
}

/**
 * Build everything the renderer needs for one frame.
 */
export function buildFrame(input: FrameInput): Frame {
  const frame: Frame = {
    shapes: [],
    zones: [],
    hoveredId: null,
    pointerId: null,
    anchors: new Map(),
    tooltip: null,
  }

  const fade = getFade(input.scale)
  const k = fade * input.transition
  if (k < 0.01) {
    return frame
  }

  const tabs: Shape[] = []
  const knobs: Shape[] = []
  const bars: Shape[] = []
  const outlines: Shape[] = []
  const areas: Shape[] = []
  const bands = new Map<AddTargetId, Shape>()
  const tooltips = new Map<AddTargetId, TooltipRequest>()

  if (input.siblings) {
    const { block, prev, next, flow } = input.siblings
    const sides = getBeforeAfterSides(block, prev, next, flow)
    for (const id of ['before', 'after'] as const) {
      const side = sides[id]
      const rect = getTabRect(block, side, input.scale, k, input.viewport)
      tabs.push({
        type: 'tab',
        targetId: id,
        rect,
        side,
        hovered: false,
        alpha: k,
      })
      frame.zones.push({ targetId: id, kind: 'tab', rect })
      frame.anchors.set(id, getCenter(rect))
      bands.set(id, {
        type: 'band',
        targetId: id,
        rect: getBandRect(block, side, input.scale),
        side,
        hovered: true,
        alpha: k,
      })
      // Like today, the tooltip goes towards the inside of the block.
      const inward = opposite(side)
      const tabCenter = getCenter(rect)
      tooltips.set(id, {
        targetId: id,
        anchor: pointTowards(
          tabCenter,
          (isHorizontalEdge(side) ? rect.height : rect.width) / 2,
          inward,
        ),
        side: inward,
      })
    }
  }

  const revealed = getRevealedFields(
    input.fields,
    input.pointer,
    input.isTouch,
    input.activeId,
  )

  for (const field of input.fields) {
    if (field.isEmpty) {
      const radius = getKnobRadius(
        Math.min(field.rect.width, field.rect.height),
        k,
      )
      const center = snap(getVisibleCenter(field.rect, input.viewport))
      const knobRect = circleRect(center, radius)
      areas.push({
        type: 'area',
        targetId: field.id,
        rect: field.rect,
        side: 'bottom',
        hovered: false,
        alpha: k,
      })
      knobs.push({
        type: 'knob',
        targetId: field.id,
        rect: knobRect,
        side: 'bottom',
        hovered: false,
        alpha: k,
      })
      frame.zones.push({
        targetId: field.id,
        kind: 'knob',
        rect: knobRect,
        radius,
      })
      frame.zones.push({ targetId: field.id, kind: 'area', rect: field.rect })
      frame.anchors.set(field.id, center)
      tooltips.set(field.id, {
        targetId: field.id,
        anchor: pointTowards(center, radius, 'top'),
        side: 'top',
      })
      continue
    }

    if (!revealed.ids.has(field.id)) {
      continue
    }

    const side = getFieldEndSide(field.last, field.secondLast, field.flow)
    const endBar = getEndBar(field.rect, side, field.last, k, input.viewport)
    const knobRect = circleRect(endBar.knob, endBar.radius)
    bars.push({
      type: 'bar',
      targetId: field.id,
      rect: endBar.bar,
      side,
      hovered: false,
      alpha: k,
    })
    knobs.push({
      type: 'knob',
      targetId: field.id,
      rect: knobRect,
      side,
      hovered: false,
      alpha: k,
    })
    frame.zones.push({
      targetId: field.id,
      kind: 'knob',
      rect: knobRect,
      radius: endBar.radius,
    })
    frame.zones.push({ targetId: field.id, kind: 'bar', rect: endBar.band })
    frame.anchors.set(field.id, endBar.knob)
    const inward = opposite(side)
    tooltips.set(field.id, {
      targetId: field.id,
      anchor: pointTowards(endBar.knob, endBar.radius, inward),
      side: inward,
    })

    if (field.id === revealed.underPointer) {
      outlines.push({
        type: 'outline',
        targetId: field.id,
        rect: field.rect,
        side,
        hovered: false,
        alpha: k,
      })
    }
  }

  // What's under the pointer. While a bundle selector is open, its target is.
  let pointerHit: AddTargetId | null = null
  if (
    !input.isTouch &&
    input.pointer &&
    contains(input.viewport, input.pointer)
  ) {
    pointerHit = hitTest(frame.zones, input.pointer, 2)?.targetId ?? null
  }
  frame.pointerId = pointerHit
  frame.hoveredId = input.activeId ?? pointerHit

  if (frame.hoveredId) {
    for (const shape of [...tabs, ...knobs, ...bars, ...areas]) {
      shape.hovered = shape.targetId === frame.hoveredId
    }
  }

  // The tooltip only for what the pointer is on, not while a selector is open.
  if (pointerHit && !input.activeId) {
    frame.tooltip = tooltips.get(pointerHit) ?? null
  }

  // Behind the hovered tab: where the block goes.
  const band =
    frame.hoveredId === 'before' || frame.hoveredId === 'after'
      ? bands.get(frame.hoveredId)
      : undefined

  const visible = expand(input.viewport, CULL_MARGIN)
  frame.shapes = [
    ...hoveredFirst(tabs),
    ...(band ? [band] : []),
    ...hoveredFirst(knobs),
    ...bars,
    ...outlines,
    ...areas,
  ]
    .filter((shape) => intersects(shape.rect, visible))
    .slice(0, MAX_SHAPES)

  return frame
}
