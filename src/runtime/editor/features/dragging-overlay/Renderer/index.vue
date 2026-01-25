<template>
  <Teleport :to="ui.mainLayoutElement.value">
    <slot
      :background-color="activeBackgroundColorHex"
      :color="activeColor"
      :label="active?.label"
    />
  </Teleport>
</template>

<script lang="ts" setup>
import { falsy, onlyUnique } from '#blokkli/helpers'
import {
  findClosestRectangle,
  intersects,
  isInsideRect,
} from '#blokkli/editor/helpers/geometry'
import { toShaderColor, rgbaToString } from '#blokkli/editor/helpers/color'
import { ref, computed, useBlokkli } from '#imports'
import {
  setBuffersAndAttributes,
  drawBufferInfo,
  setUniforms,
  type BufferInfo,
} from 'twgl.js'
import vs from './vertex.glsl?raw'
import fs from './fragment.glsl?raw'
import { RectangleBufferCollector } from '#blokkli/editor/helpers/webgl'
import {
  determineCanAddChildren,
  getChildrenOrientation,
  getGapSize,
  MIN_GAP,
  type Orientation,
} from '#blokkli/editor/helpers/dropTargets'
import type { RGB } from './../../../../../global/types/theme'
import {
  fragmentBlockBundle,
  fromLibraryBlockBundle,
  itemEntityType,
} from '#blokkli-build/config'
import { defineRenderer, onBlokkliEvent } from '#blokkli/editor/composables'
import type { DropTargetEvent } from '#blokkli/editor/events'
import type { Coord, Rectangle } from '#blokkli/editor/types/geometry'
import type { DraggableItem } from '#blokkli/editor/types/draggable'
import type { DropArea } from '#blokkli/editor/types/ui'
import type { BlokkliFieldElement } from '#blokkli/editor/types/field'

const props = defineProps<{
  items: DraggableItem[]
  box: Rectangle
  mouseX: number
  mouseY: number
  isTouch: boolean
}>()

const {
  dom,
  ui,
  theme,
  dropAreas,
  eventBus,
  animation,
  state,
  types,
  fields,
  definitions,
  context,
} = useBlokkli()

const FIELD_MIN_DRAW_SIZE = 6
const alphaBase = 0.7

const colorTeal = rgbaToString(theme.teal.value.normal)
const colorTealAlpha = rgbaToString(theme.teal.value.normal, alphaBase)
const colorAccent = rgbaToString(theme.accent.value[800])
const colorAccentAlpha = rgbaToString(theme.accent.value[800], alphaBase)

enum RectRenderType {
  DROP_AREA,
  FIELD_1,
  FIELD_2,
  FIELD_3,
  FIELD_4,
  ACTIVE_AREA,
}

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
  state?: number
  nestingLevel?: number
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
  // Prevent accidental drops. At least 200ms should have passed between the
  // time the drag was initiated and when the drop was made.
  if (active.value && timeDelta > 200) {
    if (active.value.type === 'field') {
      const [hostUuid, fieldName, preceedingUuid] = active.value.id.split(':')
      if (!hostUuid || !fieldName) {
        return
      }

      const field = fields.find(hostUuid, fieldName)

      if (!field) {
        return
      }

      eventBus.emit('dragging:drop', {
        field,
        preceedingUuid: preceedingUuid ?? null,
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
      if (
        item.itemType === 'existing' ||
        item.itemType === 'existing_structure'
      ) {
        bundles.push(item.block.bundle)
        if (item.block.library?.reusableBundle) {
          bundles.push(item.block.library.reusableBundle)
        }
      } else if ('itemBundle' in item) {
        if (item.itemBundle) {
          bundles.push(item.itemBundle)
        }
      } else if (item.itemType === 'action' && item.action.itemBundle) {
        bundles.push(item.action.itemBundle)
      } else if ('itemBundles' in item) {
        bundles.push(...item.itemBundles)
      }

      return bundles
    })
    .filter(falsy)
    .filter(onlyUnique),
)

/**
 * The fragment names being dragged (for blokkli_fragment bundles only).
 */
const draggingFragments = computed<string[]>(() =>
  props.items
    .flatMap((item) => {
      if (
        (item.itemType === 'existing' ||
          item.itemType === 'existing_structure') &&
        item.block.bundle === fragmentBlockBundle &&
        item.block.fragment?.name
      ) {
        return [item.block.fragment.name]
      }
      return []
    })
    .filter(falsy),
)

const selectionUuids = computed<string[]>(() =>
  props.items
    .map((item) => {
      if (item.itemType === 'existing') {
        return item.block.uuid
      }
    })
    .filter(falsy),
)

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
  let prevElOffsetTop = 0
  let prevElHeight = 0

  for (let i = 0; i < field.childrenElements.length; i++) {
    const childrenForUuid: FieldRectChild[] = []

    const isLast = i === field.childrenElements.length - 1

    const el = field.childrenElements[i]
    if (!(el instanceof HTMLElement)) {
      continue
    }

    const uuid = el.dataset.bkUuid
    if (!uuid) {
      continue
    }

    if (!visible.includes(uuid)) {
      // Track position even for invisible blocks so we can calculate gaps correctly
      const elRect =
        dom.getBlockRect(uuid) ||
        ui.getAbsoluteElementRect(dom.getBoundingClientRect(el))
      prevElOffsetTop = elRect.y - field.y
      prevElHeight = el.scrollHeight
      prevUuid = uuid
      continue
    }

    const cached = fieldChildCache[uuid]
    if (cached) {
      // Track position even when using cached drop targets
      const elRect =
        dom.getBlockRect(uuid) ||
        ui.getAbsoluteElementRect(dom.getBoundingClientRect(el))
      prevElOffsetTop = elRect.y - field.y
      prevElHeight = el.scrollHeight
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
      ui.getAbsoluteElementRect(dom.getBoundingClientRect(el))

    // Calculate the offset to the parent. We can not use el.offsetTop/el.offsetLeft here because the value could be 0.
    const elOffsetTop = elRect.y - field.y
    const elOffsetLeft = elRect.x - field.x
    const elHeight = el.scrollHeight

    // Last element.
    if (isLast) {
      const id = buildChildId(field.field, uuid, 'last', uuid)
      if (field.orientation === 'vertical') {
        childrenForUuid.push({
          id,
          width: field.width,
          height: MIN_GAP,
          x: 0,
          y: elOffsetTop + elHeight,
          label: field.label,
        })
      } else {
        childrenForUuid.push({
          id,
          width: MIN_GAP,
          height: el.offsetHeight,
          x: elOffsetLeft + el.offsetWidth + (field.gap - MIN_GAP) / 2,
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
      prevElOffsetTop = elOffsetTop
      prevElHeight = elHeight
      children.push(...childrenForUuid)
      continue
    }

    const id = buildChildId(field.field, prevUuid, 'between', uuid)

    if (field.orientation === 'vertical') {
      let dropTargetY: number

      if (prevElHeight > 0) {
        // Center the drop target in the gap between previous and current block
        const prevBlockBottom = prevElOffsetTop + prevElHeight
        const gapMiddle = (prevBlockBottom + elOffsetTop) / 2
        dropTargetY = gapMiddle - MIN_GAP / 2
      } else {
        // First element: center between field top and block top
        const gapMiddle = elOffsetTop / 2
        dropTargetY = gapMiddle - MIN_GAP / 2
      }

      childrenForUuid.push({
        id,
        width: field.width,
        height: MIN_GAP,
        x: 0,
        y: dropTargetY,
        label: field.label,
      })
    } else {
      childrenForUuid.push({
        id,
        width: MIN_GAP,
        height: Math.max(el.offsetHeight, MIN_GAP),
        x:
          Math.max(elOffsetLeft - field.gap, -field.gap) +
          (field.gap - MIN_GAP) / 2,
        y: elOffsetTop,
        label: field.label,
      })
    }

    fieldChildCache[uuid] = childrenForUuid

    children.push(...childrenForUuid)

    prevElOffsetTop = elOffsetTop
    prevElHeight = elHeight
    prevUuid = uuid
  }
  return children
}

const fieldCache: Record<string, FieldRect> = {}

// Cache for field trail HTML strings.
const fieldTrailCache: Record<string, string> = {}

// Cache for parent block chains (array of HTML span strings).
const parentChainCache: Record<string, string[]> = {}

function getBlockLabel(bundle: string, props?: Record<string, any>): string {
  // Fragment: Use fragment definition label.
  if (bundle === fragmentBlockBundle && props?.name) {
    const fragmentDef = definitions.getFragmentDefinition(props.name)
    if (fragmentDef?.label) {
      return fragmentDef.label
    }
  }

  // Reusable block: Use library item label.
  if (bundle === fromLibraryBlockBundle && props?.libraryItem?.label) {
    return props.libraryItem.label
  }

  // Default: Use bundle definition label.
  return types.getBlockBundleDefinition(bundle)?.label || bundle
}

function getFieldLabel(
  entityType: string,
  entityBundle: string,
  fieldName: string,
): string {
  return (
    types.getFieldConfig(entityType, entityBundle, fieldName)?.label ||
    fieldName
  )
}

function buildParentChain(uuid: string, bundle: string): string[] {
  const cached = parentChainCache[uuid]
  if (cached) {
    return cached
  }

  const parts: string[] = []

  // Get the field this block is in.
  const fieldInfo = state.getFieldListForBlock(uuid)
  if (!fieldInfo) {
    return []
  }

  // Get parent's chain recursively.
  const parentUuid = state.getParentEntityUuid(uuid)
  const parentItem = parentUuid ? state.getFieldListItem(parentUuid) : null

  if (parentItem) {
    // Parent exists: get its full chain.
    const parentChain = buildParentChain(parentItem.uuid, parentItem.bundle)
    parts.push(...parentChain)
  }

  // Add the field this block is in.
  const entityBundle = parentItem
    ? parentItem.bundle
    : context.value.entityBundle
  const fieldLabel = getFieldLabel(
    fieldInfo.entityType,
    entityBundle,
    fieldInfo.name,
  )
  parts.push(`<span class="bk-is-field">${fieldLabel}</span>`)

  // Add this block.
  const item = state.getFieldListItem(uuid)
  const blockLabel = getBlockLabel(bundle, item?.props)
  parts.push(`<span class="bk-is-block">${blockLabel}</span>`)

  parentChainCache[uuid] = parts
  return parts
}

function getInsertText(field: BlokkliFieldElement): string {
  const cached = fieldTrailCache[field.key]
  if (cached) {
    return cached
  }

  const parts: string[] = []

  // Start with the host entity.
  const hostLabel =
    state.entity.value.bundleLabel || state.entity.value.label || 'Host'
  parts.push(`<span class="bk-is-host">${hostLabel}</span>`)

  // If this field is on a block (not the root entity), build the parent chain.
  if (field.hostEntityType === itemEntityType) {
    const parentUuid = field.hostEntityUuid
    const parentItem = state.getFieldListItem(parentUuid)

    if (parentItem) {
      // Build the chain from root to parent block.
      const parentChain = buildParentChain(parentUuid, parentItem.bundle)
      parts.push(...parentChain)
    }
  }

  // Add the current field.
  const fieldLabel = getFieldLabel(
    field.hostEntityType,
    field.hostEntityBundle,
    field.name,
  )
  parts.push(`<span class="bk-is-field">${fieldLabel}</span>`)

  const result = parts.join(' » ')
  fieldTrailCache[field.key] = result
  return result
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
  if (!uuid || !name) {
    return
  }
  const field = fields.find(uuid, name)
  if (!field) {
    return
  }
  const childElements = [...field.element.children] as HTMLElement[]

  const currentCount = state.getFieldBlockCount(field.key)
  const canAddChildren = determineCanAddChildren(
    field,
    childElements,
    selectionUuids.value,
    currentCount,
    props.items.length,
    draggingBundles.value,
    draggingFragments.value,
  )
  const orientation =
    field.dropAlignment || getChildrenOrientation(field.element)

  const rect = dom.getFieldRect(field.key)
  if (!rect) {
    throw new Error('Failed to get rect for field: ' + field.key)
  }
  const x = rect.x
  const y = rect.y
  const width = Math.max(rect.width, MIN_GAP)

  const height = Math.max(rect.height, MIN_GAP)
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
    return cachedDropAreaRects[area.id]!
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
  getBufferInfo(gl?: WebGLRenderingContext): {
    info: BufferInfo | null
    hasChanged: boolean
  } {
    const visibleFields = dom.getVisibleFields()
    const visibleBlocks = dom.getVisibleBlocks()

    const lengthBefore = this.positions.length

    for (let i = 0; i < visibleFields.length; i++) {
      const key = visibleFields[i]!
      const fieldRect = buildFieldRect(key)

      if (!fieldRect) {
        continue
      }
      const children = buildChildren(fieldRect, visibleBlocks)
      for (let j = 0; j < children.length; j++) {
        const child = children[j]!
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
            nestingLevel: fieldRect.field.nestingLevel,
            state: child.id.includes(':empty:')
              ? 2
              : fieldRect.orientation === 'vertical'
                ? 1
                : 0,
          },
          type,
          true,
        )
      }
    }

    const visibleAreas = Array.from(visibleDropAreas)

    for (let i = 0; i < visibleAreas.length; i++) {
      const area = areas[visibleAreas[i]!]
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
          state: 0,
        },
        RectRenderType.DROP_AREA,
        false,
      )
    }

    // This will attempt to resolve overlapping rects.
    this.processPendingRects()

    const hasChanged = lengthBefore !== this.positions.length

    // Only update the buffer info if it has changed..
    if (hasChanged && gl) {
      this.bufferInfo = this.createBufferInfo(gl)
    }

    return { info: this.bufferInfo, hasChanged }
  }

  getClosestIntersectingRect(box: Rectangle, coords: Coord): DrawnRect | null {
    const candidates: DrawnRect[] = []
    const rects = Object.values(this.rects)
    for (let i = 0; i < rects.length; i++) {
      const rect = rects[i]!
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
      return candidates[0]!
    }

    return findClosestRectangle(coords.x, coords.y, candidates)
  }

  getRectAtPosition(coord: Coord): DrawnRect | null {
    const rects = Object.values(this.rects)

    for (let i = 0; i < rects.length; i++) {
      const rect = rects[i]!
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

type FieldColorPalette = {
  gradStart: RGB
  gradEnd: RGB
  borderOuter: RGB
  borderInner: RGB
  color: RGB
}

const fieldRenderPalette = computed<
  Record<'0' | '1' | '2' | '3', FieldColorPalette>
>(() => {
  const accent = theme.accent.value
  const mono = theme.mono.value
  return {
    '0': {
      gradStart: accent[800],
      gradEnd: accent[900],
      borderOuter: [0, 0, 0],
      borderInner: accent[600],
      color: [255, 255, 255],
    },
    '1': {
      gradStart: accent[400],
      gradEnd: accent[500],
      borderOuter: accent[400],
      borderInner: accent[300],
      color: accent[950],
    },
    '2': {
      gradStart: mono[700],
      gradEnd: mono[800],
      borderOuter: [0, 0, 0],
      borderInner: mono[600],
      color: mono[100],
    },
    '3': {
      gradStart: mono[300],
      gradEnd: mono[400],
      borderOuter: mono[600],
      borderInner: mono[300],
      color: mono[100],
    },
  }
})

function getColorForField(
  field?: FieldRect | null,
  property: keyof FieldColorPalette = 'gradStart',
): RGB {
  const nestingLevel = field?.field.nestingLevel || 0
  if (nestingLevel >= 3) {
    return fieldRenderPalette.value[3][property]
  } else if (nestingLevel >= 2) {
    return fieldRenderPalette.value[2][property]
  } else if (nestingLevel >= 1) {
    return fieldRenderPalette.value[1][property]
  }
  return fieldRenderPalette.value[0][property]
}

const activeBackgroundColorRgb = computed<RGB | undefined>(() => {
  if (active.value?.type === 'drop-area') {
    return theme.teal.value.normal
  }
  if (!active.value) {
    return
  }
  return getColorForField(active.value?.field)
})

function joinRgb(rgb: RGB): string {
  return rgb.join(' ')
}

const activeColor = computed<string | undefined>(() => {
  if (active.value?.type === 'drop-area') {
    return joinRgb(theme.teal.value.light)
  }
  if (!active.value) {
    return
  }
  return joinRgb(getColorForField(active.value?.field, 'color'))
})

const activeBackgroundColorHex = computed<string>(() => {
  if (activeBackgroundColorRgb.value) {
    return joinRgb(activeBackgroundColorRgb.value)
  }
  return ''
})

const activeHoverField = ref<FieldRect | null>(null)

const activeHoverRect = computed<[number, number, number, number]>(() => {
  if (!activeHoverField.value) {
    return [0, 0, 0, 0]
  }

  const outset = activeHoverField.value.field.nestingLevel === 0 ? 0 : 20

  // If this field has an empty child rect, use its adjusted position from collector.
  if (activeHoverField.value.emptyChild) {
    const emptyChildId = activeHoverField.value.emptyChild.id
    const adjustedRect = collector.rects[emptyChildId]

    if (adjustedRect) {
      return [
        adjustedRect.x - outset,
        adjustedRect.y - outset,
        adjustedRect.width + 2 * outset,
        adjustedRect.height + 2 * outset,
      ]
    }
  }

  return [
    activeHoverField.value.x - outset,
    activeHoverField.value.y - outset,
    activeHoverField.value.width + 2 * outset,
    activeHoverField.value.height + 2 * outset,
  ]
})

const activeHoverColor = computed<RGB>(() => {
  return getColorForField(activeHoverField.value)
})

const activeHoverFieldNestingLevel = computed<number>(() => {
  return activeHoverField.value?.field.nestingLevel ?? 0
})

type UniformValue =
  | RGB
  | string
  | boolean
  | undefined
  | number
  | [number, number, number, number]
  | number[]

const uniforms = computed<Record<string, UniformValue>>(() => {
  const index = active.value?.index
  return {
    u_color_hover_area: toShaderColor(activeHoverColor.value),
    u_color_area: toShaderColor(theme.teal.value.normal),
    u_drop_area: [
      ...toShaderColor(theme.teal.value.light),
      ...toShaderColor(theme.teal.value.normal),
      ...toShaderColor(theme.teal.value.dark),
      ...toShaderColor(theme.teal.value.light),
    ],
    u_field_0: [
      ...toShaderColor(fieldRenderPalette.value[0].gradStart),
      ...toShaderColor(fieldRenderPalette.value[0].gradEnd),
      ...toShaderColor(fieldRenderPalette.value[0].borderOuter),
      ...toShaderColor(fieldRenderPalette.value[0].borderInner),
    ],
    u_field_1: [
      ...toShaderColor(fieldRenderPalette.value[1].gradStart),
      ...toShaderColor(fieldRenderPalette.value[1].gradEnd),
      ...toShaderColor(fieldRenderPalette.value[1].borderOuter),
      ...toShaderColor(fieldRenderPalette.value[1].borderInner),
    ],
    u_field_2: [
      ...toShaderColor(fieldRenderPalette.value[2].gradStart),
      ...toShaderColor(fieldRenderPalette.value[2].gradEnd),
      ...toShaderColor(fieldRenderPalette.value[2].borderOuter),
      ...toShaderColor(fieldRenderPalette.value[2].borderInner),
    ],
    u_field_3: [
      ...toShaderColor(fieldRenderPalette.value[3].gradStart),
      ...toShaderColor(fieldRenderPalette.value[3].gradEnd),
      ...toShaderColor(fieldRenderPalette.value[3].borderOuter),
      ...toShaderColor(fieldRenderPalette.value[3].borderInner),
    ],
    u_active_rect_id: index === undefined ? -1 : index,
    u_active_hover_rect: activeHoverRect.value,
    u_active_hover_nesting_level: activeHoverFieldNestingLevel.value,
    u_field_min_size: FIELD_MIN_DRAW_SIZE,
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
    const field = fields[i]!
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

// Store buffer info for use in both event handler and renderer
let bufferInfo: BufferInfo | null = null
let bufferChanged = false

// Register WebGL renderer with zIndex 400 (dragging layer - highest priority)
// Set "only" to true so that when dragging, only drop targets are rendered
const { collector } = defineRenderer('drop-targets', {
  zIndex: 400,
  only: true,
  collector: () => {
    const c = new DropTargetRectangleBufferCollector({ deferredMode: true })
    // Add a rectangle that we will use to display the hovered field area.
    // The vertex shader will dynamically transform the quad to match the currently hovered field area.
    c.addRectangle(
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
        state: 0,
      },
      RectRenderType.ACTIVE_AREA,
      false,
    )
    return c
  },
  program: () => ({ shaders: [vs, fs] }),
  cursor: () => 'grabbing',
  render: (_ctx, gl, program) => {
    const scale = ui.artboardScale.value
    const offset = { ...ui.artboardOffset.value }

    dragBox.value = {
      x: (props.box.x - offset.x) / scale,
      y: (props.box.y - offset.y) / scale,
      width: props.box.width / scale,
      height: props.box.height / scale,
    }

    const mouseAbsolute = toCanvasSpaceCoordinates(props.mouseX, props.mouseY)

    const result = collector.getBufferInfo(gl)
    bufferInfo = result.info
    bufferChanged = result.hasChanged

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

    setHoveredFieldArea(dragBox.value, mouseAbsolute)

    gl.useProgram(program.program)
    animation.setSharedUniforms(gl, program)
    setUniforms(program, uniforms.value)

    // Nothing to draw.
    if (!bufferInfo) {
      return
    }

    // Only update buffer and attributes when they have changed.
    if (bufferChanged) {
      setBuffersAndAttributes(gl, program, bufferInfo)
    }

    drawBufferInfo(gl, bufferInfo, gl.TRIANGLES)
  },
  renderFallback: (ctx, ctx2d) => {
    const scale = ui.artboardScale.value
    const offset = { ...ui.artboardOffset.value }

    dragBox.value = {
      x: (props.box.x - offset.x) / scale,
      y: (props.box.y - offset.y) / scale,
      width: props.box.width / scale,
      height: props.box.height / scale,
    }

    const mouseAbsolute = toCanvasSpaceCoordinates(props.mouseX, props.mouseY)

    // Get buffer info without WebGL context (collector still builds rectangles)
    const result = collector.getBufferInfo(undefined)
    bufferInfo = result.info
    bufferChanged = result.hasChanged

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

    setHoveredFieldArea(dragBox.value, mouseAbsolute)

    // Render using 2D canvas
    const rects = Object.values(collector.rects)

    for (let i = 0; i < rects.length; i++) {
      const rect = rects[i]!
      if (rect.id === 'active-hover-rect') {
        continue
      }
      const isActive = active.value?.id === rect.id
      let drawX = rect.x
      let drawY = rect.y
      let drawWidth = rect.width
      let drawHeight = rect.height

      if (!isActive && rect.type === 'field') {
        const isVertical =
          rect.id.includes(':empty:') || rect.field?.orientation === 'vertical'
        if (isVertical) {
          drawHeight = Math.min(FIELD_MIN_DRAW_SIZE, rect.height)
          drawY = rect.y + (rect.height - drawHeight) / 2
        } else {
          drawWidth = Math.min(FIELD_MIN_DRAW_SIZE, rect.width)
          drawX = rect.x + (rect.width - drawWidth) / 2
        }
      }
      const isField = rect.type === 'field'
      if (active.value?.id === rect.id) {
        ctx2d.fillStyle = isField
          ? rgbaToString(getColorForField(rect.field))
          : rect.color
      } else {
        ctx2d.fillStyle = isField
          ? rgbaToString(getColorForField(rect.field), 0.7)
          : rect.colorAlpha
      }

      ctx2d.fillRect(
        (drawX * scale + offset.x) * ctx.dpi,
        (drawY * scale + offset.y) * ctx.dpi,
        drawWidth * ctx.dpi * scale,
        drawHeight * ctx.dpi * scale,
      )
    }
  },
})
</script>
