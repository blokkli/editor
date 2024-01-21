<template>
  <div
    class="bk-dragging-overlay"
    :style="style"
    :class="{ 'bk-is-touch': isTouch }"
  >
    <div
      v-for="(rect, i) in rects"
      :key="i"
      :class="{ 'bk-is-top': rect.isTop }"
      :style="{
        width: rect.width + 'px',
        height: rect.height + 'px',
        transform: `translate(${rect.x}px, ${rect.y}px) scale(${rect.scaleX}, ${rect.scaleY})`,
        opacity: rect.opacity,
        background: rect.background,
        transformOrigin: rect.transformOrigin,
        borderRadius: rect.borderRadius,
      }"
      v-html="rect.markup"
    />
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  useBlokkli,
  onMounted,
  onUnmounted,
  onBeforeUnmount,
} from '#imports'
import type { Coord, DraggableItem, Rectangle } from '#blokkli/types'
import { isInsideRect, realBackgroundColor, lerp } from '#blokkli/helpers'
import { easeOutElastic } from '#blokkli/helpers/easing'

const { eventBus, dom, ui, animation, theme } = useBlokkli()

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
}>()

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
  }
})

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
    elementOpacity?: string
    transformOrigin: string
    element: HTMLElement
    borderRadius: string
  }

const rects = ref<AnimationRectangle[]>([])

const animationStart = Date.now()
const duration = 500

const onAnimationFrame = () => {
  const newRects: AnimationRectangle[] = []

  const elapsed = Date.now() - animationStart
  const alphaX = easeOutElastic(elapsed / duration, 1.92, 0.51)
  const alphaY = easeOutElastic(elapsed / duration, 2.2, 0.46)
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

  if (elapsed > duration || !ui.useAnimations.value) {
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
    eventBus.off('animationFrame', onAnimationFrame)
    return
  }
  rects.value = newRects
}

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
  const elRects = props.items.map((item, index) => {
    const itemElement =
      item.itemType === 'existing' ? item.dragElement() : item.element()
    const element = (itemElement.querySelector('.bk-drop-element') ||
      itemElement) as HTMLElement

    return {
      rect: element.getBoundingClientRect(),
      element,
      item,
      index,
    }
  })

  // Find the matching bound rectangle that will determine the size of the box that is being dragged.
  const boundRect =
    elRects.find((v) =>
      isInsideRect(props.startCoords.x, props.startCoords.y, v.rect),
    ) || elRects[0]

  const bounds = getDraggingBounds(
    props.startCoords,
    boundRect.rect,
    props.isTouch ? 250 : 500,
  )
  const boundsX = props.isTouch ? 0 : bounds.x
  const boundsY = props.isTouch ? translateY.value : bounds.y

  offsetX.value = props.startCoords.x - boundsX
  offsetY.value = props.startCoords.y - boundsY
  width.value = bounds.width
  height.value = bounds.height

  const artboardScale = ui.getArtboardScale()

  rects.value = elRects.map((item) => {
    const isTop = item.index === boundRect.index
    const rect = item.rect
    const element =
      item.item.itemType === 'existing'
        ? item.item.dragElement()
        : item.item.element()
    const baseRect = element.getBoundingClientRect()
    const targetScaleX = Math.min(bounds.width / item.element.scrollWidth, 1)
    // const targetScaleY = Math.min(bounds.height / item.element.scrollHeight, 1)
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
      opacity: isTop ? (props.isTouch ? 1 : 1) : 0.1,
      x: isTop ? 0 : (bounds.width - rect.width * targetScaleX) / 2,
      y: isTop ? 0 : (bounds.height - rect.height * targetScaleX) / 2,
      scaleX: targetScaleX,
      scaleY: targetScaleY,
    }

    const style = theme.getDraggableStyle(element)

    return {
      isTop,
      from,
      to,
      ...from,
      width: item.element.offsetWidth,
      height: item.element.offsetHeight,
      opacity: 1,

      transformOrigin: `${originX}px ${originY}px`,
      markup: dom.getDropElementMarkup(item.item),
      background: realBackgroundColor(item.element),
      elementOpacity:
        item.item.itemType === 'existing'
          ? item.element.style.opacity
          : undefined,
      element: item.element,
      borderRadius: style.radiusString,
    }
  })

  elRects.forEach((item) => {
    if (item.item.itemType === 'existing') {
      item.element.style.opacity = '0.2'
    }
  })

  eventBus.on('animationFrame', onAnimationFrame)
})

onBeforeUnmount(() => {
  // Restore the original opacity on the blocks.
  rects.value.forEach((item) => {
    if (item.elementOpacity !== undefined) {
      item.element.style.opacity = item.elementOpacity
    }
  })
})

onUnmounted(() => {
  eventBus.off('animationFrame', onAnimationFrame)
})
</script>
