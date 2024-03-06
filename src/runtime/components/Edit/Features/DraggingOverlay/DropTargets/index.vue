<template>
  <Teleport to=".bk-main-canvas">
    <div class="bk bk-drop-targets">
      <div
        v-for="field in fieldRects"
        v-show="field.children.length"
        :key="field.key"
        class="bk-drop-targets-field"
        :data-drop-target-field="field.key"
        :style="field.style"
      >
        <div
          v-for="child in field.children"
          :key="child.key"
          :style="child.style"
          :data-prev-uuid="child.prevUuid"
          :data-drop-target-key="child.key"
          :data-field-label="field.label"
          class="bk-drop-targets-field-child"
          :class="[
            { 'bk-is-active': activeKey === child.key },
            { 'bk-is-nested': child.isNested },
            'bk-is-' + child.orientation,
          ]"
          @click.stop.prevent.capture="onChildClick(field, child)"
          @touchstart.passive="activeKey = child.key"
          @touchend.passive="activeKey = ''"
        >
          <span>{{ field.label }}</span>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import {
  falsy,
  intersects,
  isInsideRect,
  findClosestRectangle,
  calculateIntersection,
  realBackgroundColor,
} from '#blokkli/helpers'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import type {
  BlokkliFieldElement,
  DraggableHostData,
  DraggableItem,
  Rectangle,
} from '#blokkli/types'
import { ref, computed, useBlokkli, onMounted, onBeforeUnmount } from '#imports'

const activeKey = ref('')

type Orientation = 'horizontal' | 'vertical'

type FieldRectChild = {
  key: string
  style: Record<string, any>
  orientation: Orientation
  prevUuid?: string
  isNested: boolean
}

type FieldRect = {
  key: string
  disabled: boolean
  field: BlokkliFieldElement
  style: Record<string, any>
  backgroundColor: string
  children: FieldRectChild[]
  label: string
}

export type DropTargetEvent = {
  items: DraggableItem[]
  field: BlokkliFieldElement
  host: DraggableHostData
  preceedingUuid?: string
}

const { dom, ui, $t } = useBlokkli()

const emit = defineEmits<{
  (e: 'drop', data: DropTargetEvent): void
}>()

const props = defineProps<{
  items: DraggableItem[]
  box: Rectangle
  mouseX: number
  mouseY: number
  isTouch: boolean
  disabled: boolean
}>()

const onChildClick = (field: FieldRect, child: FieldRectChild) => {
  emit('drop', {
    field: field.field,
    preceedingUuid: child.prevUuid,
    items: [...props.items],
    host: {
      type: field.field.hostEntityType,
      uuid: field.field.hostEntityUuid,
      fieldName: field.field.name,
    },
  })
}

const onMouseUp = (e: MouseEvent) => {
  if (activeKey.value) {
    e.preventDefault()
    e.stopPropagation()
    const el = document.querySelector(
      `[data-drop-target-key="${activeKey.value}"]`,
    )
    if (!(el instanceof HTMLElement)) {
      return
    }
    const prevUuid = el.dataset.prevUuid
    const fieldKey = el.parentElement?.dataset.dropTargetField
    if (!fieldKey) {
      return
    }

    const field = fieldRects.value.find((v) => v.key === fieldKey)

    if (!field) {
      return
    }
    emit('drop', {
      field: field.field,
      preceedingUuid: prevUuid,
      items: [...props.items],
      host: {
        type: field.field.hostEntityType,
        uuid: field.field.hostEntityUuid,
        fieldName: field.field.name,
      },
    })
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

const isAction = computed(
  () => props.items.length === 1 && props.items[0].itemType === 'action',
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

const getChildren = (field: BlokkliFieldElement): FieldRectChild[] => {
  const children: FieldRectChild[] = []
  const fieldWidth = field.element.offsetWidth
  const fieldHeight = field.element.offsetHeight

  const orientation = getChildrenOrientation(field.element)
  const childElements = [...field.element.children] as HTMLElement[]

  // Check cardinality of field.
  if (field.cardinality !== -1) {
    if (childElements.length >= field.cardinality) {
      const selectionAreChildren =
        selectionUuids.value.length &&
        selectionUuids.value.every((uuid) =>
          childElements.find((v) => v.dataset.uuid === uuid),
        )
      // Return no drop targets if any of the selected blocks is not part of the field.
      // That way we can still return drop targets when a block is moved inside the field.
      if (!selectionAreChildren) {
        return []
      }
    }
  }

  const allBundlesAllowed =
    isAction.value ||
    (draggingBundles.value.length &&
      draggingBundles.value.every((bundle) =>
        field.allowedBundles.includes(bundle),
      ))
  if (!allBundlesAllowed) {
    return []
  }

  let prevWasInSelection = false
  let prevUuid: string | undefined = ''

  if (childElements.length === 0) {
    if (orientation === 'horizontal') {
      children.push({
        key: field.key + '_empty',
        orientation,
        isNested: field.isNested,
        style: {
          left: '0px',
          top: '0px',
          width: '100%',
          height: '100%',
        },
      })
    } else {
      children.push({
        key: field.key + '_empty',
        isNested: field.isNested,
        orientation,
        style: {
          left: '0px',
          top: '0px',
          width: '100%',
          height: fieldHeight > 30 ? '100%' : '30px',
          // height: '100%',
        },
      })
    }
  }

  const gap = Math.max(getGapSize(orientation, field.element), 30)

  for (let i = 0; i < childElements.length; i++) {
    const el = childElements[i]
    if (!(el instanceof HTMLElement)) {
      continue
    }

    const uuid = el.dataset.uuid
    if (!uuid) {
      continue
    }

    // Skip child if it's part of the selection.
    if (selectionUuids.value.includes(uuid)) {
      prevWasInSelection = true
      prevUuid = uuid
      continue
    }

    const isLast = i === childElements.length - 1

    // Last element.
    if (isLast) {
      if (orientation === 'vertical') {
        children.push({
          prevUuid: uuid,
          key: 'last_' + uuid,
          orientation,
          isNested: field.isNested,
          style: {
            width: '100%',
            height: gap + 'px',
            left: '0px',
            top: el.offsetTop + el.scrollHeight + 'px',
          },
        })
      } else {
        const width = Math.max(
          gap,
          fieldWidth - (el.offsetLeft + el.offsetWidth),
        )
        children.push({
          prevUuid: uuid,
          key: 'last_' + uuid,
          orientation,
          isNested: field.isNested,
          style: {
            width: width + 'px',
            height: el.offsetHeight + 'px',
            left:
              Math.min(
                el.offsetLeft + el.offsetWidth,
                window.innerWidth - width,
              ) + 'px',
            top: el.offsetTop + 'px',
          },
        })
      }
    }

    // If the previous element was part of the selection, don't add a child,
    // because the move operation would result in the same position.
    if (prevWasInSelection) {
      prevWasInSelection = false
      prevUuid = uuid
      continue
    }

    if (orientation === 'vertical') {
      children.push({
        prevUuid,
        key: uuid,
        orientation,
        isNested: field.isNested,
        style: {
          width: '100%',
          height: gap + 'px',
          left: '0px',
          top: el.offsetTop - gap / 2 + 'px',
        },
      })
    } else {
      children.push({
        prevUuid,
        key: uuid,
        orientation,
        isNested: field.isNested,
        style: {
          width: gap + 'px',
          height: Math.max(el.offsetHeight, 30) + 'px',
          left: Math.max(el.offsetLeft - gap, 0) + 'px',
          top: el.offsetTop + 'px',
        },
      })
    }

    prevUuid = uuid
  }
  return children
}

const fieldRects = ref<FieldRect[]>([])

const buildFieldRects = (): FieldRect[] => {
  const insertText = $t('draggingOverlayInsertText', 'Insert into @field')
  const artboardEl = ui.artboardElement()
  const artboardRect = artboardEl.getBoundingClientRect()
  const scale = ui.getArtboardScale()
  const rects: FieldRect[] = []
  const allFields = dom.getAllFields()
  for (let i = 0; i < allFields.length; i++) {
    const field = allFields[i]
    const rect = field.element.getBoundingClientRect()
    const x = rect.x / scale - artboardRect.x / scale
    const y = rect.y / scale - artboardRect.y / scale + artboardEl.scrollTop
    const children = getChildren(field)
    const backgroundColor = realBackgroundColor(field.element)
    const height = Math.max(field.element.offsetHeight, 30)
    const width = Math.max(field.element.offsetWidth, 30)

    rects.push({
      key: field.key,
      field,
      disabled: children.length === 0,
      style: {
        width: width + 'px',
        height: height + 'px',
        transform: `translate(${x}px, ${y}px)`,
      },
      backgroundColor,
      children,
      label: insertText.replace('@field', field.label),
    })
  }

  return rects
}

type IntersectingRectangle = Rectangle & { key: string; intersection: number }

const getSelectedRect = (): string | undefined => {
  if (props.disabled) {
    return
  }

  // Check if the cursor position is over a viewport blocking rect.
  const isInsideBlockingRect = ui.viewportBlockingRects.value.find((rect) =>
    isInsideRect(props.mouseX, props.mouseY, rect),
  )
  if (isInsideBlockingRect) {
    return
  }

  // Check if the cursor position is inside the visible viewport area.
  const isInsideVisibleViewport = isInsideRect(
    props.mouseX,
    props.mouseY,
    ui.visibleViewport.value,
  )
  if (!isInsideVisibleViewport) {
    return
  }
  const elements = [...document.querySelectorAll('[data-drop-target-key]')]

  const intersectingRects: IntersectingRectangle[] = []

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i]
    if (!(el instanceof HTMLElement)) {
      continue
    }
    const rect = el.getBoundingClientRect()
    const key = el.dataset.dropTargetKey
    if (!key) {
      continue
    }
    if (isInsideRect(props.mouseX, props.mouseY, rect)) {
      return key
    }
    if (intersects(props.box, rect)) {
      const intersection = calculateIntersection(rect, props.box)
      intersectingRects.push({
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        key,
        intersection,
      })
    }
  }

  if (intersectingRects.length === 0) {
    return
  } else if (intersectingRects.length === 1) {
    return intersectingRects[0].key
  }

  // Sort by intersection area.
  intersectingRects.sort((a, b) => b.intersection - a.intersection)

  const first = intersectingRects[0]
  const second = intersectingRects[1]
  const diff = first.intersection - second.intersection
  // If the difference of area overlap between the first and second candidate
  // is larger than the threshold, return the first.
  if (diff > 0.1) {
    return first.key
  }

  // Fallback: Return the rectangle that is closest to the cursor.
  const closest = findClosestRectangle(
    props.mouseX,
    props.mouseY,
    intersectingRects,
  )
  return closest.key
}

let prevMouseX = 0
let prevMouseY = 0

onBlokkliEvent('animationFrame', () => {
  if (props.isTouch) {
    return
  }
  // We only want to do the calculations for changes in 5px steps.
  const mouseX = Math.round(props.mouseX / 5)
  const mouseY = Math.round(props.mouseY / 5)

  // Only do the calculations if the mouse position has actually changed.
  if (prevMouseX !== mouseX || prevMouseY !== mouseY) {
    activeKey.value = getSelectedRect() || ''
    prevMouseX = mouseX
    prevMouseY = mouseY
  }
})

onMounted(() => {
  document.body.classList.add('bk-is-dragging')
  fieldRects.value = buildFieldRects()
  if (!props.isTouch) {
    document.body.addEventListener('mouseup', onMouseUp)
  }
})

onBeforeUnmount(() => {
  document.body.classList.remove('bk-is-dragging')
  document.body.removeEventListener('mouseup', onMouseUp)
})
</script>
