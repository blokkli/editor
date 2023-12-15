<template>
  <Teleport to=".bk-main-canvas">
    <div class="bk bk-drop-targets" @mouseup.capture="onMouseUp">
      <div
        v-for="field in fieldRects"
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
          class="bk-drop-targets-field-child"
          :class="[
            { 'bk-is-active': activeKey === child.key },
            'bk-is-' + child.orientation,
          ]"
        ></div>
      </div>
    </div>
    <!-- <div class="bk bk-drop-targets-area"> -->
    <!--   <div -->
    <!--     v-for="field in fieldRects" -->
    <!--     :key="'area_' + field.key" -->
    <!--     :style="{ ...field.style, backgroundColor: field.backgroundColor }" -->
    <!--     :class="{ 'bk-is-disabled': field.disabled }" -->
    <!--   /> -->
    <!-- </div> -->
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
import type {
  BlokkliFieldElement,
  DraggableHostData,
  DraggableItem,
  Rectangle,
} from '#blokkli/types'
import { computed, useBlokkli, onMounted, onBeforeUnmount } from '#imports'

const activeKey = ref('')

type Orientation = 'horizontal' | 'vertical'

type FieldRectChild = {
  key: string
  style: Record<string, any>
  orientation: Orientation
  prevUuid?: string
}

type FieldRect = {
  key: string
  disabled: boolean
  field: BlokkliFieldElement
  style: Record<string, any>
  backgroundColor: string
  children: FieldRectChild[]
}

export type DropTargetEvent = {
  items: DraggableItem[]
  field: BlokkliFieldElement
  host: DraggableHostData
  preceedingUuid?: string
}

const { dom, ui, eventBus } = useBlokkli()

const emit = defineEmits<{
  (e: 'drop', data: DropTargetEvent): void
}>()

const props = defineProps<{
  items: DraggableItem[]
  box: Rectangle
  mouseX: number
  mouseY: number
}>()

const onMouseUp = () => {
  if (activeKey.value) {
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

const draggingBundles = computed<string[]>(() => {
  return props.items
    .flatMap((item) => {
      return item.itemBundle
    })
    .filter(falsy)
})

const selectionUuids = computed<string[]>(() => {
  return props.items
    .map((item) => {
      if (item.itemType === 'existing') {
        return item.uuid
      }
    })
    .filter(falsy)
})

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

  const orientation = getChildrenOrientation(field.element)
  const childElements = [...field.element.children]

  // Check cardinality of field.
  if (field.cardinality !== -1) {
    if (childElements.length >= field.cardinality) {
      return []
    }
  }

  const allBundlesAllowed =
    draggingBundles.value.length &&
    draggingBundles.value.every((bundle) =>
      field.allowedBundles.includes(bundle),
    )
  if (!allBundlesAllowed) {
    return []
  }

  let prevWasInSelection = false
  let prevUuid: string | undefined = ''

  if (childElements.length === 0) {
    children.push({
      key: field.key + '_empty',
      orientation,
      style: {
        left: '0px',
        top: '0px',
        width: '100%',
        height: '100%',
      },
    })
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
          style: {
            width: '100%',
            height: gap + 'px',
            left: '0px',
            top: el.offsetTop + el.scrollHeight + 'px',
          },
        })
      } else {
        children.push({
          prevUuid: uuid,
          key: 'last_' + uuid,
          orientation,
          style: {
            width: gap + 'px',
            height: el.offsetHeight + 'px',
            left: el.offsetLeft + el.offsetWidth + 'px',
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
        style: {
          width: '100%',
          height: gap + 'px',
          left: '0px',
          top: el.offsetTop - gap + 'px',
        },
      })
    } else {
      children.push({
        prevUuid,
        key: uuid,
        orientation,
        style: {
          width: gap + 'px',
          height: el.offsetHeight + 'px',
          left: el.offsetLeft - gap + 'px',
          top: el.offsetTop + 'px',
        },
      })
    }

    prevUuid = uuid
  }
  return children
}

const fieldRects = ref<FieldRect[]>([])

const buildFieldRects = () => {
  const artboardRect = ui.artboardElement().getBoundingClientRect()
  const scale = ui.getArtboardScale()
  return dom.getAllFields().map((field) => {
    const rect = field.element.getBoundingClientRect()
    const x = rect.x / scale - artboardRect.x / scale
    const y = rect.y / scale - artboardRect.y / scale
    const children = getChildren(field)
    const backgroundColor = realBackgroundColor(field.element)
    return {
      key: field.key,
      field,
      disabled: children.length === 0,
      style: {
        width: field.element.offsetWidth + 'px',
        height: field.element.offsetHeight + 'px',
        transform: `translate(${x}px, ${y}px)`,
      },
      backgroundColor,
      children,
    }
  })
}

type IntersectingRectangle = Rectangle & { key: string; intersection: number }

const getSelectedRect = (): string | undefined => {
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

  // Return the rectangle that is closest to the cursor.
  const closest = findClosestRectangle(
    props.mouseX,
    props.mouseY,
    intersectingRects,
  )
  return closest.key
}

let prevMouseX = 0
let prevMouseY = 0

const onAnimationFrame = () => {
  // We only want to do the calculations for changes in 5px steps.
  const mouseX = Math.round(props.mouseX / 5)
  const mouseY = Math.round(props.mouseY / 5)

  // Only do the calculations if the mouse position has actually changed.
  if (prevMouseX !== mouseX || prevMouseY !== mouseY) {
    console.log('Calculate')
    activeKey.value = getSelectedRect() || ''
    prevMouseX = mouseX
    prevMouseY = mouseY
  }
}

onMounted(() => {
  document.body.classList.add('bk-is-dragging')
  fieldRects.value = buildFieldRects()
  eventBus.on('animationFrame', onAnimationFrame)
})

onBeforeUnmount(() => {
  document.body.classList.remove('bk-is-dragging')
  eventBus.off('animationFrame', onAnimationFrame)
})
</script>
