<template>
  <Teleport to="body">
    <slot :color="activeColorHex" :label="active?.label" />
  </Teleport>
</template>

<script lang="ts" setup>
import {
  falsy,
  findClosestRectangle,
  intersects,
  isInsideRect,
  rgbaToString,
  toShaderColor,
} from '#blokkli/helpers'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import type {
  DropTargetEvent,
  BlokkliFieldElement,
  DraggableItem,
  DropArea,
  Rectangle,
  Coord,
} from '#blokkli/types'
import { ref, computed, useBlokkli, onBeforeUnmount } from '#imports'
import {
  setBuffersAndAttributes,
  drawBufferInfo,
  setUniforms,
  type BufferInfo,
} from 'twgl.js'
import vs from './vertex.glsl?raw'
import fs from './fragment.glsl?raw'
import { RectangleBufferCollector } from '#blokkli/helpers/webgl'

const props = defineProps<{
  items: DraggableItem[]
  box: Rectangle
  mouseX: number
  mouseY: number
  isTouch: boolean
}>()

const MIN_GAP = 20

enum RectRenderType {
  DROP_AREA,
  FIELD_1,
  FIELD_2,
  FIELD_3,
  FIELD_4,
  ACTIVE_AREA,
}

type Orientation = 'horizontal' | 'vertical'

type FieldRectChild = Rectangle & {
  id: string
  label: string
}

type FieldRect = Rectangle & {
  key: string
  field: BlokkliFieldElement
  label: string
  canAddChildren: boolean
  emptyChild?: FieldRectChild
  orientation: Orientation
  gap: number
  childrenElements: HTMLElement[]
}

type DrawnRect = Rectangle & {
  id: string
  type: 'field' | 'drop-area' | 'active-area'
  label: string
  color: string
  colorAlpha: string
  field?: FieldRect
  index: number
}

const dragStart = Date.now()

const cursorIsInsideClipped = () =>
  isInsideRect(props.mouseX, props.mouseY, ui.visibleViewport.value) &&
  !ui.viewportBlockingRects.value.some((v) =>
    isInsideRect(props.mouseX, props.mouseY, v),
  )

const active = ref<DrawnRect | null>(null)

defineEmits<{
  (e: 'drop', data: DropTargetEvent): void
}>()

const {
  dom,
  ui,
  theme,
  dropAreas,
  eventBus,
  animation,
  state,
  runtimeConfig,
  types,
} = useBlokkli()

const gl = animation.gl()
const canvas = animation.getCanvasElement()
const ctx: CanvasRenderingContext2D | null =
  !gl && canvas ? canvas.getContext('2d') : null

const programInfo = gl
  ? animation.registerProgram('drop_targets', gl, [vs, fs])
  : null

const areas = dropAreas
  .getDropAreas(props.items)
  .reduce<Record<string, DropArea>>((acc, v) => {
    acc[v.id] = v
    return acc
  }, {})

const visibleDropAreas: Set<string> = new Set()

const areasObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.target instanceof HTMLElement) {
        const id = entry.target.dataset.dropAreaId
        if (id) {
          if (entry.isIntersecting) {
            visibleDropAreas.add(id)
          } else {
            visibleDropAreas.delete(id)
          }
        }
      }
    }
  },
  {
    threshold: 0,
  },
)

Object.values(areas).forEach((area) => {
  area.element.dataset.dropAreaId = area.id
  areasObserver.observe(area.element)
})

onBlokkliEvent('mouse:down', (e) => {
  const coord = toCanvasSpaceCoordinates(e.x, e.y)
  const match = collector.getRectAtPosition(coord)
  active.value = match || null
})

onBlokkliEvent('mouse:up', (e) => {
  if (!active.value) {
    return
  }

  // On touch devices, if the distance is greater than the threshold, the user
  // has likely interacted with the artboard (panning, zooming).
  if (props.isTouch && e.distance > 10) {
    active.value = null
    return
  }

  // On desktop, only emit drop if the distance is greater than the threshold.
  // This prevents accidentally moving a block.
  if (!props.isTouch && e.distance < 7) {
    return
  }

  emitDrop()
})

const emitDrop = async () => {
  const timeDelta = Date.now() - dragStart
  // Prevent accidental drops. At least 400ms should have passed between the
  // time the drag was initiated and when the drop was made.
  if (active.value && timeDelta > 400) {
    if (active.value.type === 'field') {
      const [hostUuid, fieldName, preceedingUuid] = active.value.id.split(':')

      const field = dom.findField(hostUuid, fieldName)

      if (!field) {
        return
      }

      eventBus.emit('dragging:drop', {
        field,
        preceedingUuid,
        items: [...props.items],
        host: {
          type: field.hostEntityType,
          uuid: field.hostEntityUuid,
          fieldName: field.name,
        },
      })
      return
    } else if (active.value.type === 'drop-area') {
      const area = areas[active.value.id]
      if (!area) {
        return
      }
      await area.onDrop()
    }
  }

  eventBus.emit('dragging:end')
  eventBus.emit('item:dropped')
}

function getChildrenOrientation(element: HTMLElement): Orientation {
  const computedStyle = window.getComputedStyle(element)

  // Check for Flex layout
  if (computedStyle.display.includes('flex')) {
    // Flex direction row or row-reverse indicates horizontal layout
    if (
      computedStyle.flexDirection === 'row' ||
      computedStyle.flexDirection === 'row-reverse'
    ) {
      return 'horizontal'
    } else {
      // Otherwise, it's vertical
      return 'vertical'
    }
  }

  // Check for Grid layout
  if (computedStyle.display.includes('grid')) {
    // We'll need to check the grid-template-columns and grid-template-rows
    // This is a simple check, assuming a basic grid layout
    if (computedStyle.gridTemplateColumns.split(' ').length > 1) {
      return 'horizontal'
    } else {
      return 'vertical'
    }
  }

  // Default to vertical for block elements and other displays
  return 'vertical'
}

/**
 * The bundles being dragged.
 *
 * In case of dragging a from_library block, the bundle of the reusable block is also returned here.
 */
const draggingBundles = computed<string[]>(() =>
  props.items
    .flatMap((item) => {
      const bundles: string[] = []
      if ('itemBundle' in item && item.itemBundle) {
        bundles.push(item.itemBundle)
      }
      if ('reusableBundle' in item && item.reusableBundle) {
        bundles.push(item.reusableBundle)
      }
      return bundles
    })
    .filter(falsy),
)

const selectionUuids = computed<string[]>(() =>
  props.items
    .map((item) => {
      if (item.itemType === 'existing') {
        return item.uuid
      }
    })
    .filter(falsy),
)

function getGapSize(orientation: Orientation, element: HTMLElement): number {
  const computedStyle = window.getComputedStyle(element)

  // Check for Grid or Flex layout
  if (
    computedStyle.display.includes('grid') ||
    computedStyle.display.includes('flex')
  ) {
    const gap =
      orientation === 'vertical'
        ? computedStyle.columnGap || computedStyle.gridColumnGap
        : computedStyle.rowGap || computedStyle.gridRowGap

    if (gap) {
      // Extract the first value.
      const gapParts = gap.split(' ')
      const gapValue = gapParts[0]
      if (gapValue.endsWith('px')) {
        return Number.parseFloat(gapValue)
      }
    }
  }

  return MIN_GAP
}

const fieldChildCache: Record<string, FieldRectChild[]> = {}

const buildChildId = (
  field: BlokkliFieldElement,
  preceedingUuid?: string | undefined | null,
  type?: string | undefined | null,
  uuid?: string | undefined | null,
) => {
  return `${field.key}:${preceedingUuid || ''}:${type || ''}:${uuid || ''}`
}

const buildChildren = (
  field: FieldRect,
  visible: string[],
): FieldRectChild[] => {
  if (!field.canAddChildren) {
    return []
  }

  if (field.emptyChild) {
    return [field.emptyChild]
  }

  const children: FieldRectChild[] = []

  let prevWasInSelection = false
  let prevUuid: string | undefined = ''

  for (let i = 0; i < field.childrenElements.length; i++) {
    const childrenForUuid: FieldRectChild[] = []

    const isLast = i === field.childrenElements.length - 1

    const el = field.childrenElements[i]
    if (!(el instanceof HTMLElement)) {
      continue
    }

    const uuid = el.dataset.uuid
    if (!uuid) {
      continue
    }

    if (!visible.includes(uuid)) {
      prevUuid = uuid
      continue
    }

    const cached = fieldChildCache[uuid]
    if (cached) {
      children.push(...cached)
      prevUuid = uuid
      continue
    }

    // Skip child if it's part of the selection.
    if (selectionUuids.value.includes(uuid)) {
      prevWasInSelection = true
      prevUuid = uuid
      continue
    }

    // Get the rect of the block. Use a cached one if possible.
    const elRect =
      dom.getBlockRect(uuid) ||
      ui.getAbsoluteElementRect(el.getBoundingClientRect())

    // Calculate the offset to the parent. We can not use el.offsetTop/el.offsetLeft here because the value could be 0.
    const elOffsetTop = elRect.y - field.y
    const elOffsetLeft = elRect.x - field.x

    // Last element.
    if (isLast) {
      const id = buildChildId(field.field, uuid, 'last', uuid)
      if (field.orientation === 'vertical') {
        childrenForUuid.push({
          id,
          width: field.width,
          height: field.gap,
          x: 0,
          y: elOffsetTop + el.scrollHeight,
          label: field.label,
        })
      } else {
        childrenForUuid.push({
          id,
          width: field.gap,
          height: el.offsetHeight,
          x: elOffsetLeft + el.offsetWidth,
          y: elOffsetTop,
          label: field.label,
        })
      }
    }

    // If the previous element was part of the selection, don't add a child,
    // because the move operation would result in the same position.
    if (prevWasInSelection) {
      prevWasInSelection = false
      prevUuid = uuid
      children.push(...childrenForUuid)
      continue
    }

    const id = buildChildId(field.field, prevUuid, 'between', uuid)

    if (field.orientation === 'vertical') {
      childrenForUuid.push({
        id,
        width: field.width,
        height: field.gap,
        x: 0,
        y: elOffsetTop - field.gap / 2,
        label: field.label,
      })
    } else {
      childrenForUuid.push({
        id,
        width: field.gap,
        height: Math.max(el.offsetHeight, MIN_GAP),
        x: Math.max(elOffsetLeft - field.gap, -field.gap),
        y: elOffsetTop,
        label: field.label,
      })
    }

    fieldChildCache[uuid] = childrenForUuid

    children.push(...childrenForUuid)

    prevUuid = uuid
  }
  return children
}

const fieldCache: Record<string, FieldRect> = {}

function getBundleLabel(field: BlokkliFieldElement): string {
  if (field.hostEntityType === runtimeConfig.itemEntityType) {
    return (
      types.getBlockBundleDefinition(field.hostEntityBundle)?.label ||
      field.hostEntityBundle
    )
  }

  return state.entity.value.bundleLabel || field.hostEntityBundle
}

function getInsertText(field: BlokkliFieldElement): string {
  const bundleLabel = getBundleLabel(field)
  return `${bundleLabel} » <strong>${field.label}</strong>`
}

const determineCanAddChildren = (
  field: BlokkliFieldElement,
  children: HTMLElement[],
) => {
  // Check cardinality of field.
  if (field.cardinality !== -1) {
    // Current block count.
    const count = state.getFieldBlockCount(field.key)

    // Count of children that are also part of the selection.
    const childrenThatAreSelection = children.filter((child) => {
      const uuid = child.dataset.uuid
      if (!uuid) {
        return false
      }
      return selectionUuids.value.includes(uuid)
    }).length
    const countAfter = count - childrenThatAreSelection + props.items.length
    if (countAfter > field.cardinality) {
      return false
    }
  }

  return (
    !draggingBundles.value.length ||
    draggingBundles.value.every((bundle) =>
      field.allowedBundles.includes(bundle),
    )
  )
}

const buildEmptyChild = (
  field: BlokkliFieldElement,
  children: HTMLElement[],
  orientation: Orientation,
  fieldWidth: number,
  fieldHeight: number,
): FieldRectChild | undefined => {
  if (children.length === 0) {
    const id = buildChildId(field, null, 'empty')
    if (orientation === 'horizontal') {
      return {
        id,
        x: 0,
        y: 0,
        width: fieldWidth,
        height: fieldHeight,
        label: getInsertText(field),
      }
    } else {
      return {
        id,
        x: 0,
        y: 0,
        width: fieldWidth,
        height: Math.max(fieldHeight, MIN_GAP),
        label: getInsertText(field),
      }
    }
  }
}

const buildFieldRect = (key: string): FieldRect | undefined => {
  if (fieldCache[key]) {
    return fieldCache[key]
  }

  const [uuid, name] = key.split(':')
  const field = dom.findField(uuid, name)
  if (!field) {
    return
  }
  const childElements = [...field.element.children] as HTMLElement[]

  const canAddChildren = determineCanAddChildren(field, childElements)
  const orientation =
    field.dropAlignment || getChildrenOrientation(field.element)

  const rect = dom.getFieldRect(field.key)
  if (!rect) {
    throw new Error('Failed to get rect for field: ' + field.key)
  }
  const x = rect.x
  let y = rect.y
  const height = Math.max(rect.height, MIN_GAP)
  const width = Math.max(rect.width, MIN_GAP)

  if (rect.height <= 24) {
    y -= 60
  }
  const emptyChild = buildEmptyChild(
    field,
    childElements,
    orientation,
    width,
    height,
  )
  const gap = Math.max(getGapSize(orientation, field.element), MIN_GAP)

  const fieldRect = {
    key: field.key,
    field,
    width,
    height,
    x,
    y,
    label: getInsertText(field),
    canAddChildren,
    emptyChild,
    orientation,
    gap,
    childrenElements: childElements,
  }

  fieldCache[key] = fieldRect
  return fieldRect
}

const cachedDropAreaRects: Record<string, Rectangle> = {}

const buildDropAreaRect = (area: DropArea): Rectangle => {
  if (cachedDropAreaRects[area.id]) {
    return cachedDropAreaRects[area.id]
  }

  const rect = ui.getAbsoluteElementRect(area.element)

  const dropAreaRect: Rectangle = {
    x: rect.x,
    y: rect.y,
    width: Math.max(rect.width, MIN_GAP),
    height: Math.max(rect.height, MIN_GAP),
  }

  cachedDropAreaRects[area.id] = dropAreaRect
  return dropAreaRect
}

const colorTeal = rgbaToString(theme.teal.value.normal)
const colorTealAlpha = rgbaToString(theme.teal.value.normal, 0.7)
const colorAccent = rgbaToString(theme.accent.value[800])
const colorAccentAlpha = rgbaToString(theme.accent.value[800], 0.7)

function getRectType(field: BlokkliFieldElement): RectRenderType {
  if (field.nestingLevel >= 3) {
    return RectRenderType.FIELD_4
  } else if (field.nestingLevel >= 2) {
    return RectRenderType.FIELD_3
  } else if (field.nestingLevel >= 1) {
    return RectRenderType.FIELD_2
  }
  return RectRenderType.FIELD_1
}

class DropTargetRectangleBufferCollector extends RectangleBufferCollector<DrawnRect> {
  getBufferInfo(): { info: BufferInfo | null; hasChanged: boolean } {
    const visibleFields = dom.getVisibleFields()
    const visibleBlocks = dom.getVisibleBlocks()

    const lengthBefore = this.positions.length

    for (let i = 0; i < visibleFields.length; i++) {
      const key = visibleFields[i]
      const fieldRect = buildFieldRect(key)

      if (!fieldRect) {
        continue
      }
      const children = buildChildren(fieldRect, visibleBlocks)
      for (let j = 0; j < children.length; j++) {
        const child = children[j]
        if (this.added.has(child.id)) {
          continue
        }
        const type = getRectType(fieldRect.field)
        this.addRectangle(
          {
            id: child.id,
            type: 'field',
            label: child.label,
            color: colorAccent,
            colorAlpha: colorAccentAlpha,
            x: fieldRect.x + child.x,
            y: fieldRect.y + child.y,
            width: child.width,
            height: child.height,
            field: fieldRect,
          },
          type,
        )
      }
    }

    const visibleAreas = Array.from(visibleDropAreas)

    for (let i = 0; i < visibleAreas.length; i++) {
      const area = areas[visibleAreas[i]]
      if (!area) {
        continue
      }
      if (this.added.has(area.id)) {
        continue
      }
      const areaRect = buildDropAreaRect(area)

      this.addRectangle(
        {
          id: area.id,
          type: 'drop-area',
          label: area.label,
          color: colorTeal,
          colorAlpha: colorTealAlpha,
          x: areaRect.x,
          y: areaRect.y,
          width: areaRect.width,
          height: areaRect.height,
        },
        RectRenderType.DROP_AREA,
      )
    }

    const hasChanged = lengthBefore !== this.positions.length

    // Only update the buffer info if it has changed.
    if (hasChanged) {
      this.bufferInfo = this.createBufferInfo()
    }

    return { info: this.bufferInfo, hasChanged }
  }

  getClosestIntersectingRect(box: Rectangle, coords: Coord): DrawnRect | null {
    const candidates: DrawnRect[] = []
    const rects = Object.values(this.rects)
    for (let i = 0; i < rects.length; i++) {
      const rect = rects[i]
      if (rect.type === 'active-area') {
        continue
      }
      if (intersects(box, rect)) {
        candidates.push(rect)
      }
    }

    if (candidates.length === 0) {
      return null
    } else if (candidates.length === 1) {
      return candidates[0]
    }

    return findClosestRectangle(coords.x, coords.y, candidates)
  }

  getRectAtPosition(coord: Coord): DrawnRect | null {
    const rects = Object.values(this.rects)

    for (let i = 0; i < rects.length; i++) {
      const rect = rects[i]
      if (rect.type === 'active-area') {
        continue
      }
      if (isInsideRect(coord.x, coord.y, rect)) {
        return rect
      }
    }

    return null
  }
}

const collector = new DropTargetRectangleBufferCollector(gl)

// Add a rectangle that we will use to display the hovered field area.
// The vertex shader will dynamically transform the quad to match the currently hovered field area.
collector.addRectangle(
  {
    id: 'active-hover-rect',
    type: 'active-area',
    label: 'Field Area',
    color: 'red',
    colorAlpha: 'red',
    x: 0,
    y: 0,
    width: ui.artboardSize.value.width,
    height: ui.artboardSize.value.height,
  },
  RectRenderType.ACTIVE_AREA,
)

const fieldColors = computed(() => {
  return {
    '0': theme.accent.value[900],
    '1': theme.accent.value[400],
    '2': theme.accent.value[600],
    '3': theme.accent.value[500],
  }
})

function getColorForField(field?: FieldRect | null) {
  const nestingLevel = field?.field.nestingLevel || 0
  if (nestingLevel >= 3) {
    return fieldColors.value[3]
  } else if (nestingLevel >= 2) {
    return fieldColors.value[2]
  } else if (nestingLevel >= 1) {
    return fieldColors.value[1]
  }
  return fieldColors.value[0]
}

const activeColorRgb = computed(() => {
  if (active.value?.type === 'drop-area') {
    return theme.teal.value.normal
  }
  return getColorForField(active.value?.field)
})

const activeColorHex = computed(() => {
  if (activeColorRgb.value) {
    return rgbaToString(activeColorRgb.value)
  }
  return ''
})

const activeHoverField = ref<FieldRect | null>(null)

const activeHoverRect = computed(() => {
  if (!activeHoverField.value) {
    return [0, 0, 0, 0]
  }

  const outset = activeHoverField.value.field.nestingLevel === 0 ? 0 : 20

  return [
    activeHoverField.value.x - outset,
    activeHoverField.value.y - outset,
    activeHoverField.value.width + 2 * outset,
    activeHoverField.value.height + 2 * outset,
  ]
})

const activeHoverColor = computed(() => {
  return getColorForField(activeHoverField.value)
})

const uniforms = computed(() => {
  const index = active.value?.index
  return {
    u_color_field_0: toShaderColor(fieldColors.value[0]),
    u_color_field_1: toShaderColor(fieldColors.value[1]),
    u_color_field_2: toShaderColor(fieldColors.value[2]),
    u_color_field_3: toShaderColor(fieldColors.value[3]),
    u_color_hover_area: toShaderColor(activeHoverColor.value),
    u_color_area: toShaderColor(theme.teal.value.normal),
    u_active_rect_id: index === undefined ? -1 : index,
    u_active_hover_rect: activeHoverRect.value,
  }
})

const dragBox = ref<Rectangle>({
  x: 0,
  y: 0,
  width: 0,
  height: 0,
})

function toCanvasSpaceCoordinates(x: number, y: number): Coord {
  const scale = ui.artboardScale.value
  const offset = { ...ui.artboardOffset.value }
  return {
    x: (x - offset.x) / scale,
    y: (y - offset.y) / scale,
  }
}

function setHoveredFieldArea(box: Rectangle, mouse: Coord) {
  if (active.value?.field) {
    if (activeHoverField.value?.key !== active.value.field.key) {
      activeHoverField.value = active.value.field
    }
    return
  }
  const fields = Object.values(fieldCache)

  let highestNestingLevel = 0
  let candidate: FieldRect | null = null

  for (let i = 0; i < fields.length; i++) {
    const field = fields[i]
    if (!field.canAddChildren) {
      continue
    }
    if (
      isInsideRect(mouse.x, mouse.y, field) &&
      field.field.nestingLevel >= highestNestingLevel
    ) {
      candidate = field
      highestNestingLevel = field.field.nestingLevel
      continue
    }
    if (
      intersects(box, field) &&
      field.field.nestingLevel >= highestNestingLevel
    ) {
      highestNestingLevel = field.field.nestingLevel
      candidate = field
    }
  }

  if (candidate && candidate.key !== activeHoverField.value?.key) {
    activeHoverField.value = candidate
  }
}

onBlokkliEvent('canvas:draw', () => {
  const scale = ui.artboardScale.value
  const offset = { ...ui.artboardOffset.value }

  dragBox.value = {
    x: (props.box.x - offset.x) / scale,
    y: (props.box.y - offset.y) / scale,
    width: props.box.width / scale,
    height: props.box.height / scale,
  }

  const mouseAbsolute = toCanvasSpaceCoordinates(props.mouseX, props.mouseY)

  if (gl && programInfo) {
    gl.useProgram(programInfo.program)
    animation.setSharedUniforms(gl, programInfo)
  }

  if (!props.isTouch) {
    if (cursorIsInsideClipped()) {
      const closest = collector.getClosestIntersectingRect(
        dragBox.value,
        mouseAbsolute,
      )

      active.value = closest || null
    } else {
      active.value = null
    }
  }

  const { info, hasChanged } = collector.getBufferInfo()

  // WebGL rendering.
  if (programInfo && gl) {
    setHoveredFieldArea(dragBox.value, mouseAbsolute)
    setUniforms(programInfo, uniforms.value)

    // Nothing to draw.
    if (info) {
      // Only update buffer and attributes when they have changed.
      if (hasChanged && gl && programInfo) {
        setBuffersAndAttributes(gl, programInfo, info)
      }

      if (gl) {
        drawBufferInfo(gl, info, gl.TRIANGLES)
      }
    }

    return
  }

  // Fallback rendering.
  if (!ctx) {
    return
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const rects = Object.values(collector.rects)

  for (let i = 0; i < rects.length; i++) {
    const rect = rects[i]
    if (active.value?.id === rect.id) {
      ctx.fillStyle = rect.color
    } else {
      ctx.fillStyle = rect.colorAlpha
    }

    ctx.fillRect(
      (rect.x * scale + offset.x) * animation.dpi.value,
      (rect.y * scale + offset.y) * animation.dpi.value,
      rect.width * animation.dpi.value * scale,
      rect.height * animation.dpi.value * scale,
    )
  }
})

onBeforeUnmount(() => {
  if (gl) {
    gl.clear(gl.COLOR_BUFFER_BIT)
  }

  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }
})
</script>
