<template>
  <Teleport to="#nuxt-root">
    <div class="bk-drop-targets-canvas">
      <canvas
        ref="canvas"
        v-bind="canvasAttributes"
        @click.stop.prevent="onClick"
        @touchstart="onTouchStart"
      />
    </div>
    <svg xmlns="http://www.w3.org/2000/svg" :viewBox="viewBox"></svg>
    <slot :color="active?.color" :label="active?.label"></slot>
  </Teleport>
</template>

<script lang="ts" setup>
import {
  falsy,
  findClosestRectangle,
  intersects,
  isInsideRect,
  rgbaToString,
} from '#blokkli/helpers'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import type {
  DropTargetEvent,
  BlokkliFieldElement,
  DraggableItem,
  DropArea,
  Rectangle,
} from '#blokkli/types'
import { ref, computed, useBlokkli, onMounted, onBeforeUnmount } from '#imports'

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
  type: 'field' | 'drop-area'
  label: string
  color: string
  colorAlpha: string
  field?: FieldRect
}

const props = defineProps<{
  items: DraggableItem[]
  box: Rectangle
  mouseX: number
  mouseY: number
  isTouch: boolean
}>()

let dragStart = Date.now()

let drawnRects: DrawnRect[] = []
const active = ref<DrawnRect | null>(null)

const emit = defineEmits<{
  (e: 'drop', data: DropTargetEvent): void
}>()

const { dom, ui, $t, theme, dropAreas, eventBus } = useBlokkli()

const viewBox = computed(() => {
  return `0 0 ${ui.viewport.value.width} ${ui.viewport.value.height}`
})

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

const canvas = ref<HTMLCanvasElement | null>(null)
const ratio = computed(() => {
  if (ui.isMobile.value) {
    return window.devicePixelRatio
  }
  return Math.min(window.devicePixelRatio, 2)
})

const canvasAttributes = computed(() => {
  return {
    width: ui.viewport.value.width * ratio.value,
    height: ui.viewport.value.height * ratio.value,
    style: {
      width: ui.viewport.value.width + 'px',
      height: ui.viewport.value.height + 'px',
    },
  }
})

const onTouchStart = (e: TouchEvent) => {
  const touch = e.touches[0]
  const match = drawnRects.find((v) =>
    isInsideRect(touch.clientX, touch.clientY, v),
  )
  active.value = match || null
}

const onTouchEnd = () => {
  active.value = null
}

const onClick = (e: MouseEvent) => {
  e.preventDefault()
  e.stopPropagation()
  const match = drawnRects.find((v) => isInsideRect(e.clientX, e.clientY, v))
  if (match) {
    active.value = match
    emitDrop()
  }
}

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

      emit('drop', {
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

const onMouseUp = (e: MouseEvent) => {
  if (active.value) {
    e.preventDefault()
    e.stopPropagation()
    emitDrop()
  }
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
 */
const draggingBundles = computed<string[]>(() =>
  props.items
    .flatMap((item) => ('itemBundle' in item ? item.itemBundle : null))
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
        return parseFloat(gapValue)
      }
    }
  }

  return 30
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

    // Last element.
    if (isLast) {
      const id = buildChildId(field.field, uuid, 'last', uuid)
      if (field.orientation === 'vertical') {
        childrenForUuid.push({
          id,
          width: field.width,
          height: field.gap,
          x: 0,
          y: el.offsetTop + el.scrollHeight,
          label: field.label,
        })
      } else {
        childrenForUuid.push({
          id,
          width: field.gap,
          height: el.offsetHeight,
          x: el.offsetLeft + el.offsetWidth,
          y: el.offsetTop,
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
        y: el.offsetTop - field.gap / 2,
        label: field.label,
      })
    } else {
      childrenForUuid.push({
        id,
        width: field.gap,
        height: Math.max(el.offsetHeight, 30),
        x: Math.max(el.offsetLeft - field.gap, -field.gap),
        y: el.offsetTop,
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

const insertText = $t('draggingOverlayInsertText', 'Insert into @field')

const determineCanAddChildren = (
  field: BlokkliFieldElement,
  children: HTMLElement[],
) => {
  // Check cardinality of field.
  if (field.cardinality !== -1) {
    if (children.length >= field.cardinality) {
      const selectionAreChildren =
        selectionUuids.value.length &&
        selectionUuids.value.every((uuid) =>
          children.find((v) => v.dataset.uuid === uuid),
        )
      // Return no drop targets if any of the selected blocks is not part of the field.
      // That way we can still return drop targets when a block is moved inside the field.
      if (!selectionAreChildren) {
        return false
      }
    }
  }

  const allBundlesAllowed =
    !draggingBundles.value.length ||
    draggingBundles.value.every((bundle) =>
      field.allowedBundles.includes(bundle),
    )
  if (!allBundlesAllowed) {
    return false
  }

  return true
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
        label: insertText.replace('@field', field.label),
      }
    } else {
      return {
        id,
        x: 0,
        y: 0,
        width: fieldWidth,
        height: fieldHeight > 30 ? 0 : 30,
        label: insertText.replace('@field', field.label),
      }
    }
  }
}

const buildFieldRect = (key: string): FieldRect | undefined => {
  if (fieldCache[key]) {
    return fieldCache[key]
  }

  const artboardEl = ui.artboardElement()
  const artboardRect = artboardEl.getBoundingClientRect()
  const scale = ui.getArtboardScale()
  const [uuid, name] = key.split(':')
  const field = dom.findField(uuid, name)
  if (!field) {
    return
  }
  const childElements = [...field.element.children] as HTMLElement[]

  const canAddChildren = determineCanAddChildren(field, childElements)
  const orientation =
    field.dropAlignment || getChildrenOrientation(field.element)

  const rect = field.element.getBoundingClientRect()
  const x = rect.x / scale - artboardRect.x / scale
  const y = rect.y / scale - artboardRect.y / scale + artboardEl.scrollTop
  const height = Math.max(field.element.offsetHeight, 30)
  const width = Math.max(field.element.offsetWidth, 30)
  const emptyChild = buildEmptyChild(
    field,
    childElements,
    orientation,
    width,
    height,
  )
  const gap = Math.max(getGapSize(orientation, field.element), 30)

  const fieldRect = {
    key: field.key,
    field,
    width,
    height,
    x,
    y,
    label: insertText.replace('@field', field.label),
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

  const artboardEl = ui.artboardElement()
  const scale = ui.getArtboardScale()
  const artboardRect = artboardEl.getBoundingClientRect()
  const rect = area.element.getBoundingClientRect()
  const x = rect.x / scale - artboardRect.x / scale
  const y = rect.y / scale - artboardRect.y / scale + artboardEl.scrollTop
  const height = Math.max(area.element.offsetHeight, 30)
  const width = Math.max(area.element.offsetWidth, 30)

  const dropAreaRect: Rectangle = { x, y, width, height }

  // cachedDropAreaRects[area.id] = dropAreaRect
  return dropAreaRect
}

const colorTeal = rgbaToString(theme.teal.value.normal)
const colorTealAlpha = rgbaToString(theme.teal.value.normal, 0.7)
const colorAccent = rgbaToString(theme.accent.value[800])
const colorAccentAlpha = rgbaToString(theme.accent.value[800], 0.7)
const colorAccentAlphaLight = rgbaToString(theme.accent.value[800], 0.1)

onBlokkliEvent('animationFrame', () => {
  if (!canvas.value) {
    return
  }

  const ctx = canvas.value.getContext('2d')

  if (!ctx) {
    return
  }

  canvas.value.width = ui.viewport.value.width * ratio.value
  canvas.value.height = ui.viewport.value.height * ratio.value
  ctx.scale(ratio.value, ratio.value)

  const scale = ui.artboardScale.value
  const offset = { ...ui.artboardOffset.value }
  if (offset.y === 0) {
    offset.y = -window.scrollY
  }

  const visibleFields = dom.getVisibleFields()
  const visibleBlocks = dom.getVisibleBlocks()
  const fields = visibleFields.map((key) => buildFieldRect(key))

  drawnRects = []

  ctx.clearRect(
    0,
    0,
    canvasAttributes.value.width,
    canvasAttributes.value.height,
  )

  const visibleAreas = Array.from(visibleDropAreas)

  ctx.strokeStyle = colorTeal
  ctx.fillStyle = colorTealAlpha
  ctx.lineWidth = 2

  const intersectingRects: DrawnRect[] = []

  for (let i = 0; i < visibleAreas.length; i++) {
    const area = areas[visibleAreas[i]]
    if (!area) {
      continue
    }
    const areaRect = buildDropAreaRect(area)

    const x = (areaRect.x + offset.x / scale) * scale
    const y = (areaRect.y + offset.y / scale) * scale
    const width = areaRect.width * scale
    const height = areaRect.height * scale

    ctx.beginPath()
    ctx.roundRect(x, y, width, height, 3)
    ctx.stroke()
    const drawnRect: DrawnRect = {
      id: area.id,
      type: 'drop-area',
      label: area.label,
      color: colorTeal,
      colorAlpha: colorTealAlpha,
      x,
      y,
      width,
      height,
    }
    drawnRects.push(drawnRect)

    if (!props.isTouch && intersects(props.box, drawnRect)) {
      intersectingRects.push(drawnRect)
    }
    if (active.value?.id === drawnRect.id) {
      ctx.fillStyle = colorTealAlpha
      ctx.beginPath()
      ctx.roundRect(x, y, width, height, 3)
      ctx.fill()
    }
  }

  ctx.fillStyle = colorAccentAlpha
  ctx.strokeStyle = colorAccent

  for (let i = 0; i < fields.length; i++) {
    const field = fields[i]
    if (!field) {
      continue
    }

    const children = buildChildren(field, visibleBlocks)

    for (let j = 0; j < children.length; j++) {
      const child = children[j]
      ctx.beginPath()
      const x = (field.x + child.x + offset.x / scale) * scale
      const y = (field.y + child.y + offset.y / scale) * scale
      const width = child.width * scale
      const height = child.height * scale
      ctx.roundRect(x, y, width, height, 3)
      ctx.stroke()
      const drawnRect: DrawnRect = {
        id: child.id,
        type: 'field',
        label: child.label,
        color: colorAccent,
        colorAlpha: colorAccentAlpha,
        x,
        y,
        width,
        height,
        field,
      }
      drawnRects.push(drawnRect)

      if (!props.isTouch && intersects(props.box, drawnRect)) {
        intersectingRects.push(drawnRect)
      }

      if (active.value?.id === drawnRect.id) {
        ctx.fillStyle = colorAccentAlpha
        ctx.beginPath()
        ctx.roundRect(x, y, width, height, 3)
        ctx.fill()
      }
    }
  }

  if (!props.isTouch) {
    const closest = getClosestDrawnRect(
      intersectingRects,
      props.mouseX,
      props.mouseY,
    )

    active.value = closest
  }

  if (active.value && active.value.field) {
    const field = active.value.field
    const x = (field.x + offset.x / scale - 10) * scale
    const y = (field.y + offset.y / scale - 10) * scale
    const width = (field.width + 20) * scale
    const height = (field.height + 20) * scale
    ctx.strokeStyle = colorAccentAlpha
    ctx.lineWidth = 2
    ctx.fillStyle = colorAccentAlphaLight
    ctx.beginPath()
    ctx.roundRect(x, y, width, height, 3)
    ctx.stroke()
    ctx.fill()
  }
})

const getClosestDrawnRect = (
  rects: DrawnRect[],
  x: number,
  y: number,
): DrawnRect | null => {
  if (rects.length === 0) {
    return null
  } else if (rects.length === 1) {
    return rects[0]
  }

  return findClosestRectangle(x, y, rects)
}

onMounted(() => {
  // document.body.classList.add('bk-is-dragging')
  if (!props.isTouch) {
    document.body.addEventListener('mouseup', onMouseUp)
  }
  document.body.addEventListener('touchend', onTouchEnd, {
    capture: true,
  })
})

onBeforeUnmount(() => {
  // document.body.classList.remove('bk-is-dragging')
  document.body.removeEventListener('mouseup', onMouseUp)
  areasObserver.disconnect()
  document.body.removeEventListener('touchend', onTouchEnd, {
    capture: true,
  })
})
</script>
