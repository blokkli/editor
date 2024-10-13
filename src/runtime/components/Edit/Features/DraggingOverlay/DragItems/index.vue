<template>
  <div
    class="bk-dragging-overlay"
    :style="style"
    :class="[{ 'bk-is-touch': isTouch }, { 'bk-is-active': !!activeLabel }]"
  >
    <Transition name="bk-drag-item">
      <div
        v-show="activeLabel"
        class="bk-dragging-overlay-label"
        :style="{ backgroundColor: activeColor }"
      >
        <Icon name="cursor-move" />
        <p v-html="prevActiveLabel" />
      </div>
    </Transition>
    <div
      v-for="(rect, i) in rects"
      :key="i"
      class="bk-dragging-overlay-item"
      :class="{ 'bk-is-top': rect.isTop, 'bk-is-fallback': !rect.markup }"
      :style="{
        width: rect.width + 'px',
        height: rect.height + 'px',
        transform: `translate(${rect.x}px, ${rect.y}px) scale(${rect.scaleX}, ${rect.scaleY})`,
        opacity: rect.opacity,
        background: rect.background,
        transformOrigin: rect.transformOrigin,
        borderRadius: rect.borderRadius,
      }"
    >
      <div
        v-if="rect.markup"
        class="bk-dragging-overlay-markup"
        v-html="rect.markup"
      />
      <div
        v-else
        class="bk-dragging-overlay-fallback"
        :style="{ color: rect.fallbackColor }"
      >
        <div :style="{ transform: `scale(${1 / rect.to.scaleX})` }">
          <template v-if="rect.isTop">
            <ItemIcon v-if="rect.bundle" :bundle="rect.bundle" />
            <Icon v-else-if="rect.icon" :name="rect.icon as any" />
            <div v-if="rect.label">{{ rect.label }}</div>
          </template>
        </div>
      </div>
    </div>
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
} from '#imports'
import type { Coord, DraggableItem, Rectangle } from '#blokkli/types'
import {
  isInsideRect,
  realBackgroundColor,
  lerp,
  falsy,
} from '#blokkli/helpers'
import { Icon, ItemIcon } from '#blokkli/components'
import { easeOutElastic } from '#blokkli/helpers/easing'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'

const { dom, ui, animation, theme, types } = useBlokkli()

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

const prevActiveLabel = ref('')

watch(
  () => props.activeLabel,
  function (label) {
    if (label) {
      prevActiveLabel.value = label
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

type AnimationRectangle = Rectangle &
  AnimationRectangleValues & {
    isTop: boolean
    from: AnimationRectangleValues
    to: AnimationRectangleValues
    markup: string
    background: string
    prevVisibility?: string
    transformOrigin: string
    element: HTMLElement
    borderRadius: string
    bundle?: string
    icon?: string
    label?: string
    fallbackColor: string
  }

const rects = ref<AnimationRectangle[]>([])

const animationStart = Date.now()
const duration = 500
const isDone = ref(false)

onBlokkliEvent('animationFrame', () => {
  if (isDone.value) {
    return
  }
  const newRects: AnimationRectangle[] = []

  const elapsed = Date.now() - animationStart
  const alphaX = easeOutElastic(elapsed / duration, 1.92, 0.91)
  const alphaY = easeOutElastic(elapsed / duration, 2.2, 0.76)
  const opacityAlpha = Math.min(Math.max(elapsed - 300, 0) / 200, 1)

  for (let i = 0; i < rects.value.length; i++) {
    const rect = rects.value[i]
    const newX = lerp(rect.from.x, rect.to.x, alphaX)
    const newY = lerp(rect.from.y, rect.to.y, alphaY)
    const newOpacity = lerp(rect.from.opacity, rect.to.opacity, opacityAlpha)

    const newScaleX = lerp(rect.from.scaleX, rect.to.scaleX, alphaX)
    const newScaleY = lerp(rect.from.scaleY, rect.to.scaleY, alphaY)

    animation.requestDraw()

    newRects.push({
      ...rect,
      x: newX,
      y: newY,
      scaleX: newScaleX,
      scaleY: newScaleY,
      opacity: newOpacity,
    })
  }

  if (
    elapsed > duration ||
    !ui.useAnimations.value ||
    ui.lowPerformanceMode.value
  ) {
    rects.value = newRects.map((v) => {
      return {
        ...v,
        opacity: v.to.opacity,
        scaleX: v.to.scaleX,
        scaleY: v.to.scaleY,
        x: v.to.x,
        y: v.to.y,
      }
    })
    isDone.value = true
    return
  }
  rects.value = newRects
})

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

onMounted(() => {
  const elRects = props.items
    .map((item, index) => {
      const itemElement =
        item.itemType === 'existing' ? dom.getDragElement(item) : item.element()
      if (!itemElement) {
        return
      }
      const element = (itemElement.querySelector('.bk-drop-element') ||
        itemElement) as HTMLElement

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

  const bounds = getDraggingBounds(
    props.startCoords,
    boundRect.rect,
    // Limit width to 250px
    340,
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

      const style = theme.getDraggableStyle(element)
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
        if (item.item.itemType === 'existing' && item.item.editTitle) {
          label = item.item.editTitle
        }

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
        ...from,
        width: item.element.offsetWidth,
        height: item.element.offsetHeight,
        opacity: 1,

        transformOrigin: `${originX}px ${originY}px`,
        markup,
        background: realBackgroundColor(item.element),
        prevVisibility:
          item.item.itemType === 'existing' ||
          item.item.itemType === 'existing_structure'
            ? item.element.style.visibility
            : undefined,
        element: item.element,
        borderRadius: style.radiusString,
        bundle,
        label,
        fallbackColor: style.textColor,
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
  // Restore the original visibility on the blocks.
  rects.value.forEach((item) => {
    if (item.prevVisibility !== undefined) {
      item.element.style.visibility = item.prevVisibility
    }
  })
})
</script>
