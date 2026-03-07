<template>
  <div
    class="bk-vars bk-dragging-overlay"
    :style
    :class="[
      { 'bk-is-touch': isTouch },
      { 'bk-is-active': !!activeLabel },
      { bk: !isExisting },
    ]"
  >
    <DragItem v-for="(rect, i) in rects" :key="i" v-bind="rect" />
  </div>
  <div
    v-show="activeLabel"
    ref="labelEl"
    class="bk bk-dragging-overlay-label"
    :class="labelPosition.className"
    :style="styleLabel"
  >
    <Icon name="bk_mdi_drag_pan" />
    <p v-html="currentActiveLabel" />
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  watch,
  computed,
  useBlokkli,
  onMounted,
  onBeforeUnmount,
  useTemplateRef,
} from '#imports'
import { falsy } from '#blokkli/helpers'
import { realBackgroundColor } from '#blokkli/editor/helpers/dom'
import { isInsideRect } from '#blokkli/editor/helpers/geometry'
import { Icon } from '#blokkli/editor/components'
import DragItem, { type DragItemData } from './DragItem.vue'
import type { Coord, Rectangle } from '#blokkli/editor/types/geometry'
import type { DraggableItem } from '#blokkli/editor/types/draggable'

const { dom, ui, types, theme } = useBlokkli()

const props = defineProps<{
  /**
   * The items being dragged/placed.
   */
  items: DraggableItem[]

  /**
   * The current x position of the cursor.
   */
  x: number

  /**
   * The current y position of the cursor.
   */
  y: number

  /**
   * The coordinates when the dragging action was started.
   */
  startCoords: Coord

  isTouch: boolean

  color?: string
  backgroundColor?: string
  activeLabel?: string
  activeRect?: Rectangle
}>()

const MAX_WIDTH = 350
const MAX_HEIGHT = 200
const LABEL_GAP = 20

const labelEl = useTemplateRef('labelEl')

const labelWidth = ref(0)
const labelHeight = ref(0)

const isExisting = computed<boolean>(
  () => !!props.items.find((v) => v.itemType === 'existing'),
)

const currentActiveLabel = ref('')
const currentColor = ref('')
const currentBackgroundColor = ref('')

watch(
  () => props.activeLabel,
  function (label) {
    if (label) {
      currentActiveLabel.value = label
    }
  },
)

watch(
  () => props.backgroundColor,
  function (color) {
    if (color) {
      currentBackgroundColor.value = color
    }
  },
)

watch(
  () => props.color,
  function (color) {
    if (color) {
      currentColor.value = color
    }
  },
)

const width = ref(10)
const height = ref(10)

const offsetX = ref(0)
const offsetY = ref(0)

const translateX = computed(() => {
  if (props.isTouch) {
    return window.innerWidth / 2 - width.value / 2
  }
  return props.x - offsetX.value
})

const translateY = computed(() => {
  if (props.isTouch) {
    // 50 is the height of the "cancel dragging" button at the bottom.
    // 20 is the desired margin to the edge of the button.
    // The Math.max() calculation makes sure that a maximum of 100px is visible
    // of the drag items.
    return -50 - 20 + Math.max(0, height.value - 100)
  }
  return props.y - offsetY.value
})

const style = computed(() => {
  return {
    width: width.value + 'px',
    height: height.value + 'px',
    transform: `translate(${translateX.value}px, ${translateY.value}px)`,
    '--bk-active-background-color':
      props.backgroundColor && props.activeLabel
        ? props.backgroundColor
        : 'rgba(255,255,255,0)',
    '--bk-active-color':
      props.color && props.activeLabel ? props.color : 'rgba(255,255,255,0)',
  }
})

type LabelPlacement = 'top' | 'bottom' | 'left' | 'right'

type LabelPosition = {
  x: number
  y: number
  placement: LabelPlacement
  className: string
}

/**
 * Check if two ranges overlap on a single axis.
 */
function rangesOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && aEnd > bStart
}

function resolveVerticalPlacement(
  activeRect: Rectangle,
  dragItemsRect: Rectangle,
  lw: number,
  lh: number,
  vw: number,
  vh: number,
  gap: number,
): LabelPosition {
  // Center label horizontally on the drop target, clamped to viewport.
  const x = Math.min(
    Math.max(0, activeRect.x + activeRect.width / 2 - lw / 2),
    vw - lw,
  )

  // Only consider drag items if they overlap horizontally with the label.
  const overlapsHorizontally = rangesOverlap(
    x,
    x + lw,
    dragItemsRect.x,
    dragItemsRect.x + dragItemsRect.width,
  )

  // Place above the drop target, or above the drag items if they overlap.
  let topEdge = activeRect.y
  if (overlapsHorizontally) {
    topEdge = Math.min(topEdge, dragItemsRect.y)
  }
  let y = topEdge - lh - gap
  let placement: LabelPlacement = 'top'

  // Move below if above goes outside viewport.
  if (y < 0) {
    let bottomEdge = activeRect.y + activeRect.height
    if (overlapsHorizontally) {
      bottomEdge = Math.max(bottomEdge, dragItemsRect.y + dragItemsRect.height)
    }
    y = bottomEdge + gap
    placement = 'bottom'
  }

  y = Math.min(Math.max(0, y), vh - lh)
  return { x, y, placement, className: `bk-is-${placement}` }
}

function resolveHorizontalPlacement(
  activeRect: Rectangle,
  dragItemsRect: Rectangle,
  lw: number,
  lh: number,
  vw: number,
  vh: number,
  gap: number,
): LabelPosition {
  // Center label vertically on the drop target, clamped to viewport.
  const y = Math.min(
    Math.max(0, activeRect.y + activeRect.height / 2 - lh / 2),
    vh - lh,
  )

  // Only consider drag items if they overlap vertically with the label.
  const overlapsVertically = rangesOverlap(
    y,
    y + lh,
    dragItemsRect.y,
    dragItemsRect.y + dragItemsRect.height,
  )

  // Place left of the drop target, or left of the drag items if they overlap.
  let leftEdge = activeRect.x
  if (overlapsVertically) {
    leftEdge = Math.min(leftEdge, dragItemsRect.x)
  }
  let x = leftEdge - lw - gap
  let placement: LabelPlacement = 'left'

  // Move right if left goes outside viewport.
  if (x < 0) {
    let rightEdge = activeRect.x + activeRect.width
    if (overlapsVertically) {
      rightEdge = Math.max(rightEdge, dragItemsRect.x + dragItemsRect.width)
    }
    x = rightEdge + gap
    placement = 'right'
  }

  x = Math.min(Math.max(0, x), vw - lw)
  return { x, y, placement, className: `bk-is-${placement}` }
}

const labelPosition = computed<LabelPosition>(() => {
  if (props.activeRect && !props.isTouch) {
    const vw = ui.viewport.value.width
    const vh = ui.viewport.value.height
    const lw = labelWidth.value
    const lh = labelHeight.value
    const gap = LABEL_GAP

    const dragItemsRect = {
      x: translateX.value,
      y: translateY.value,
      width: width.value,
      height: height.value,
    }

    // Wide drop targets (horizontal bars) → left/right.
    // Tall drop targets (vertical bars) → top/bottom.
    // Very wide drop targets (e.g. root field) → top/bottom to keep label
    // close to the drag items.
    const useHorizontal =
      props.activeRect.width >= props.activeRect.height &&
      props.activeRect.width < vw / 2
    if (useHorizontal) {
      return resolveHorizontalPlacement(
        props.activeRect,
        dragItemsRect,
        lw,
        lh,
        vw,
        vh,
        gap,
      )
    }
    return resolveVerticalPlacement(
      props.activeRect,
      dragItemsRect,
      lw,
      lh,
      vw,
      vh,
      gap,
    )
  }

  // Fallback: position above drag items.
  const x = Math.min(
    Math.max(10, translateX.value - labelWidth.value / 2 + width.value / 2),
    ui.viewport.value.width - labelWidth.value,
  )
  const y = Math.max(10, translateY.value - labelHeight.value - 20)
  return { x, y, placement: 'top', className: 'bk-is-top' }
})

const styleLabel = computed(() => {
  const { x, y } = labelPosition.value
  return {
    transform: `translate(${x}px, ${y}px)`,
    '--bk-active-background-color':
      props.backgroundColor && props.activeLabel
        ? props.backgroundColor
        : 'rgba(255,255,255,0)',
    '--bk-active-color':
      props.color && props.activeLabel ? props.color : 'rgba(255,255,255,0)',
  }
})

function getRect(): Rectangle {
  return {
    x: translateX.value,
    y: translateY.value,
    width: width.value,
    height: height.value,
  }
}

defineExpose({ getRect })

type AnimationRectangleValues = {
  opacity: number
  scaleX: number
  scaleY: number
  x: number
  y: number
}

const rects = ref<DragItemData[]>([])

function getDraggingBounds(
  mouse: Coord,
  rect: Rectangle,
  maxWidth: number,
  maxHeight: number,
): Rectangle {
  const widthScale = rect.width > 0 ? maxWidth / rect.width : 1
  const heightScale = rect.height > 0 ? maxHeight / rect.height : 1
  const scale = Math.min(widthScale, heightScale, 1)
  let effectiveWidth = rect.width * scale
  let effectiveHeight = rect.height * scale
  if (
    Math.abs(rect.width - effectiveWidth) < 10 ||
    Math.abs(rect.height - effectiveHeight) < 10
  ) {
    effectiveWidth = rect.width
    effectiveHeight = rect.height
  }

  // Calculate the relative position of the drag start within the original rectangle.
  const relativeX = mouse.x - rect.x
  const relativeY = mouse.y - rect.y

  // Calculate the proportional positions within the constrained rectangle
  const proportionX = rect.width > 0 ? relativeX / rect.width : 0
  const proportionY = rect.height > 0 ? relativeY / rect.height : 0

  const effectiveRelativeX = effectiveWidth * proportionX
  const effectiveRelativeY = effectiveHeight * proportionY

  // Calculate final position
  const finalX = mouse.x - effectiveRelativeX
  const finalY = mouse.y - effectiveRelativeY

  return {
    x: finalX,
    y: finalY,
    width: effectiveWidth,
    height: effectiveHeight,
  }
}

let resizeObserver: ResizeObserver | null = null

function onResize(entries: ResizeObserverEntry[]) {
  const entry = entries[0]
  if (!entry) {
    return
  }

  labelWidth.value = entry.borderBoxSize[0]?.inlineSize ?? 0
  labelHeight.value = entry.borderBoxSize[0]?.blockSize ?? 0
}

onMounted(() => {
  if (labelEl.value) {
    resizeObserver = new ResizeObserver(onResize)
    resizeObserver.observe(labelEl.value)
  }
  const elRects = props.items
    .map((item, index) => {
      const element =
        item.itemType === 'existing' ? dom.getDragElement(item) : item.element()
      if (!element) {
        return
      }
      return {
        rect: element.getBoundingClientRect(),
        element,
        item,
        index,
      }
    })
    .filter(falsy)

  // Find the matching bound rectangle that will determine the size of the box that is being dragged.
  const boundRect =
    elRects.find((v) =>
      isInsideRect(props.startCoords.x, props.startCoords.y, v.rect),
    ) || elRects[0]

  if (!boundRect) {
    // @todo: Fallback?
    return
  }

  const mouseInsideBound = isInsideRect(
    props.startCoords.x,
    props.startCoords.y,
    boundRect.rect,
  )
  const bounds = getDraggingBounds(
    props.startCoords,
    boundRect.rect,
    MAX_WIDTH,
    MAX_HEIGHT,
  )
  let boundsX = props.isTouch ? 0 : bounds.x
  let boundsY = props.isTouch ? translateY.value : bounds.y

  // When the mouse is not inside any dragged element (e.g. copy-paste),
  // center the drag preview under the cursor. For existing blocks (e.g.
  // dragged via the move button) position the top-left at the cursor so
  // all blocks animate towards the bottom-right of the cursor.
  if (!mouseInsideBound && !props.isTouch) {
    if (isExisting.value) {
      boundsX = props.startCoords.x - 20
      boundsY = props.startCoords.y - 20
    } else {
      boundsX = props.startCoords.x - bounds.width / 2
      boundsY = props.startCoords.y - bounds.height / 2
    }
  }

  offsetX.value = props.startCoords.x - boundsX
  offsetY.value = props.startCoords.y - boundsY
  width.value = bounds.width
  height.value = bounds.height

  rects.value = elRects
    .map((item) => {
      const isTop = item.index === boundRect.index
      const rect = item.rect
      const element =
        item.item.itemType === 'existing'
          ? dom.getDragElement(item.item)
          : item.item.element()
      if (!element) {
        return
      }
      const baseRect = element.getBoundingClientRect()
      const targetScaleX = Math.min(bounds.width / item.element.offsetWidth, 1)
      const targetScaleY = targetScaleX

      const originX = 0
      const originY = 0

      const from: AnimationRectangleValues = {
        opacity: isTop ? 1 : 0.9,
        // Use offsetWidth/offsetHeight (layout size without transforms) as denominator.
        // baseRect includes both artboard scale and element's own transforms.
        // offsetWidth is the layout size (no transforms).
        // The ratio gives us the total scale factor needed (can be > 1 when zoomed in).
        scaleX: baseRect.width / item.element.offsetWidth,
        scaleY: baseRect.height / item.element.offsetHeight,
        x: props.isTouch ? rect.x - translateX.value : rect.x - boundsX,
        y: props.isTouch
          ? -rect.height -
            (window.innerHeight -
              bounds.height -
              rect.y -
              rect.height +
              translateY.value)
          : rect.y - boundsY,
      }

      const to: AnimationRectangleValues = {
        opacity: isTop ? 1 : 0.1,
        x: 0,
        y: 0,
        scaleX: targetScaleX,
        scaleY: targetScaleY,
      }

      // Get the markup and let the method check the size of the clone.
      // For elements with a very large DOM the cloning can become quite a
      // performance issue which results in a noticeable lag. In this case
      // we instead render a simple fallback.
      const markup =
        (elRects.length < 6 || isTop) && !ui.lowPerformanceMode.value
          ? dom.getDropElementMarkup(item.item, true)
          : ''
      let bundle: string | undefined
      let label = ''

      if (!markup) {
        if ('itemBundle' in item.item) {
          bundle = item.item.itemBundle
          if (bundle) {
            const definition = types.getBlockBundleDefinition(bundle)
            if (definition) {
              label = definition.label
            }
          }
        }
      }

      // Compute border radius from the original element so it's available on the first frame.
      const borderRadius = isTop
        ? theme.getDraggableStyle(item.element).radiusMin
        : 4

      return {
        isTop,
        from:
          ui.lowPerformanceMode.value ||
          (!mouseInsideBound && !isExisting.value)
            ? to
            : from,
        to,
        width: item.element.offsetWidth,
        height: item.element.offsetHeight,
        transformOrigin: `${originX}px ${originY}px`,
        markup,
        background:
          item.item.itemType === 'existing'
            ? realBackgroundColor(item.element)
            : '',
        prevVisibility:
          (item.item.itemType === 'existing' && !item.item.isCopy) ||
          item.item.itemType === 'existing_structure'
            ? item.element.style.visibility
            : undefined,
        element: item.element,
        bundle,
        label,
        borderRadius,
      }
    })
    .filter(falsy)

  elRects.forEach((item) => {
    if (
      item.item.itemType === 'existing' ||
      item.item.itemType === 'existing_structure'
    ) {
      // When copying, keep the original elements visible.
      if (item.item.itemType === 'existing' && item.item.isCopy) {
        return
      }
      // Set the visibility to hidden. Unlike setting opacity or filter, this
      // does not trigger layout trashing and style recalculation.
      item.element.style.visibility = 'hidden'
    }
  })
})

onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
  // Restore the original visibility on the blocks.
  rects.value.forEach((item) => {
    if (item.prevVisibility !== undefined) {
      item.element.style.visibility = item.prevVisibility
    }
  })
})
</script>
