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
import type { Coord, DraggableItem, Rectangle } from '#blokkli/types'
import { realBackgroundColor, falsy } from '#blokkli/helpers'
import { isInsideRect} from '#blokkli/editor/helpers/geometry'
import { Icon } from '#blokkli/components'
import DragItem, { type DragItemData } from './DragItem.vue'

const { dom, ui, types } = useBlokkli()

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

  activeColor?: string
  activeLabel?: string
}>()

const labelEl = useTemplateRef('labelEl')

const labelWidth = ref(0)
const labelHeight = ref(0)

const isExisting = computed<boolean>(
  () => !!props.items.find((v) => v.itemType === 'existing'),
)

const currentActiveLabel = ref('')
const currentActiveColor = ref('')

watch(
  () => props.activeLabel,
  function (label) {
    if (label) {
      currentActiveLabel.value = label
    }
  },
)

watch(
  () => props.activeColor,
  function (color) {
    if (color) {
      currentActiveColor.value = color
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
    '--bk-active-color':
      props.activeColor && props.activeLabel
        ? props.activeColor
        : 'rgba(255,255,255,0)',
  }
})

const styleLabel = computed(() => {
  const x = Math.min(
    Math.max(10, translateX.value - labelWidth.value / 2 + width.value / 2),
    ui.viewport.value.width - labelWidth.value,
  )
  const y = Math.max(10, translateY.value - labelHeight.value - 20)
  return {
    transform: `translate(${x}px, ${y}px)`,
    '--bk-active-color':
      props.activeColor && props.activeLabel
        ? props.activeColor
        : 'rgba(255,255,255,0)',
    backgroundColor: currentActiveColor.value,
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
): Rectangle {
  // The aspect ratio of the original rectangle.
  const aspectRatio = rect.width / rect.height

  // Apply maxWidth constraint to the rectangle's width and adjust height proportionally.
  const effectiveWidth = Math.min(rect.width, maxWidth)
  const effectiveHeight = effectiveWidth / aspectRatio

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

  const bounds = getDraggingBounds(
    props.startCoords,
    boundRect.rect,
    // Limit width to 250px
    351,
  )
  const boundsX = props.isTouch ? 0 : bounds.x
  const boundsY = props.isTouch ? translateY.value : bounds.y

  offsetX.value = props.startCoords.x - boundsX
  offsetY.value = props.startCoords.y - boundsY
  width.value = bounds.width
  height.value = bounds.height

  rects.value = elRects
    .map((item) => {
      // If the item is an existing one, we have to take the current artboard
      // scale into account when resizing the drag item.
      // All other item types (such as clipboard or search) are always rendered
      // at a 1 scale, since they are not inside the artboard.
      const artboardScale =
        item.item.itemType === 'existing' ? ui.artboardScale.value : 1
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
        scaleX: Math.min(baseRect.width / rect.width, 1) * artboardScale,
        scaleY: Math.min(baseRect.width / rect.width, 1) * artboardScale,
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

      return {
        isTop,
        from: ui.lowPerformanceMode.value ? to : from,
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
          item.item.itemType === 'existing' ||
          item.item.itemType === 'existing_structure'
            ? item.element.style.visibility
            : undefined,
        element: item.element,
        bundle,
        label,
      }
    })
    .filter(falsy)

  elRects.forEach((item) => {
    if (
      item.item.itemType === 'existing' ||
      item.item.itemType === 'existing_structure'
    ) {
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
