<template>
  <Teleport to="body">
    <div class="bk-drop-targets-canvas">
      <canvas
        ref="canvas"
        v-bind="canvasAttributes"
        @click.stop.prevent="onClick"
        @touchstart="onTouchStart"
        @touchend="onTouchEnd"
      />
    </div>
  </Teleport>
</template>

<script lang="ts">
import { falsy, intersects, isInsideRect, rgbaToString } from '#blokkli/helpers'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import type {
  BlokkliFieldElement,
  DraggableHostData,
  DraggableItem,
  Rectangle,
} from '#blokkli/types'
import { ref, computed, useBlokkli, onMounted, onBeforeUnmount } from '#imports'
export type DropTargetEvent = {
  items: DraggableItem[]
  field: BlokkliFieldElement
  host: DraggableHostData
  preceedingUuid?: string
}
</script>

<script lang="ts" setup>
type Orientation = 'horizontal' | 'vertical'

type FieldRectChild = Rectangle & {
  key: string
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

const { dom, ui, $t, theme } = useBlokkli()

const canvas = ref<HTMLCanvasElement | null>(null)
const canvasAttributes = computed(() => {
  return {
    width: ui.viewport.value.width,
    height: ui.viewport.value.height,
  }
})

const emit = defineEmits<{
  (e: 'drop', data: DropTargetEvent): void
  (e: 'update:modelValue', data: { id: string; label: string } | null): void
}>()

const props = defineProps<{
  items: DraggableItem[]
  box: Rectangle
  mouseX: number
  mouseY: number
  isTouch: boolean
  disabled: boolean
  activeColor?: string
  modelValue?: { id: string; label: string } | null | undefined
}>()

const onTouchStart = (e: TouchEvent) => {
  const touch = e.touches[0]
  const match = drawnRects.find((v) =>
    isInsideRect(touch.pageX, touch.pageY, v),
  )

  if (match) {
    emit('update:modelValue', { id: match.key, label: match.label })
  }
}

const onTouchEnd = () => {
  emit('update:modelValue', null)
}

const onClick = (e: MouseEvent) => {
  e.preventDefault()
  e.stopPropagation()
  const match = drawnRects.find((v) => isInsideRect(e.pageX, e.pageY, v))
  if (match) {
    emitDrop(match.key)
  }
}

const emitDrop = (key: string) => {
  const [hostUuid, fieldName, preceedingUuid] = key.split(':')

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
}

const onMouseUp = (e: MouseEvent) => {
  if (props.modelValue?.id) {
    e.preventDefault()
    e.stopPropagation()
    emitDrop(props.modelValue.id)
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

const buildChildKey = (
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
      const key = buildChildKey(field.field, uuid, 'last', uuid)
      if (field.orientation === 'vertical') {
        childrenForUuid.push({
          key,
          width: field.width,
          height: field.gap,
          x: 0,
          y: el.offsetTop + el.scrollHeight,
          label: field.label,
        })
      } else {
        childrenForUuid.push({
          key,
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

    const key = buildChildKey(field.field, prevUuid, 'between', uuid)

    if (field.orientation === 'vertical') {
      childrenForUuid.push({
        key,
        width: field.width,
        height: field.gap,
        x: 0,
        y: el.offsetTop - field.gap / 2,
        label: field.label,
      })
    } else {
      childrenForUuid.push({
        key,
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
    const key = buildChildKey(field, null, 'empty')
    if (orientation === 'horizontal') {
      return {
        key,
        x: 0,
        y: 0,
        width: fieldWidth,
        height: fieldHeight,
        label: insertText,
      }
    } else {
      return {
        key,
        x: 0,
        y: 0,
        width: fieldWidth,
        height: fieldHeight > 30 ? 0 : 30,
        label: insertText,
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
  const orientation = getChildrenOrientation(field.element)

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

let prevMouseX = 0
let prevMouseY = 0

const colorAccentOne = rgbaToString(theme.accent.value[700])
const colorAccentOneActive = rgbaToString(theme.accent.value[800])

let drawnRects: FieldRectChild[] = []

onBlokkliEvent('animationFrame', () => {
  // We only want to do the calculations for changes in 5px steps.
  const mouseX = Math.round(props.mouseX / 5)
  const mouseY = Math.round(props.mouseY / 5)

  if (!canvas.value) {
    return
  }

  const ctx = canvas.value.getContext('2d')

  if (!ctx) {
    return
  }

  const scale = ui.artboardScale.value
  const offset = ui.artboardOffset.value

  const visibleFields = dom.getVisibleFields()
  const visibleBlocks = dom.getVisibleBlocks()
  const fields = visibleFields.map((key) => buildFieldRect(key))

  let intersecting = false
  drawnRects = []

  ctx.clearRect(
    0,
    0,
    canvasAttributes.value.width,
    canvasAttributes.value.height,
  )

  ctx.fillStyle = colorAccentOneActive
  ctx.strokeStyle = colorAccentOneActive

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
      ctx.roundRect(x, y, width, height, 8)
      drawnRects.push({
        x,
        y,
        width,
        height,
        key: child.key,
        label: child.label,
      })

      if (!intersecting) {
        if (!props.isTouch && intersects(props.box, { x, y, width, height })) {
          intersecting = true
          if (props.modelValue?.id !== child.key && !props.isTouch) {
            emit('update:modelValue', { id: child.key, label: field.label })
          }
        }
      }
      if (child.key === props.modelValue?.id) {
        ctx.fill()
      } else {
        ctx.stroke()
      }
    }
  }

  if (!intersecting && !props.isTouch) {
    emit('update:modelValue', null)
  }

  // Only do the calculations if the mouse position has actually changed.
  if (prevMouseX !== mouseX || prevMouseY !== mouseY) {
    prevMouseX = mouseX
    prevMouseY = mouseY
  }
})

onMounted(() => {
  // document.body.classList.add('bk-is-dragging')
  if (!props.isTouch) {
    document.body.addEventListener('mouseup', onMouseUp)
  }
})

onBeforeUnmount(() => {
  // document.body.classList.remove('bk-is-dragging')
  document.body.removeEventListener('mouseup', onMouseUp)
})
</script>
