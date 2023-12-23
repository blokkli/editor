<template>
  <div class="bk-dragging-overlay" :style="style">
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

const { eventBus, dom, ui, animation } = useBlokkli()

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
}>()

const width = ref(10)
const height = ref(10)

const offsetX = ref(0)
const offsetY = ref(0)

const translateX = computed(() => {
  if (ui.isMobile.value) {
    return window.innerWidth / 2 - width.value / 2
  }
  return props.x - offsetX.value
})

const translateY = computed(() => {
  if (ui.isMobile.value) {
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
  }

const rects = ref<AnimationRectangle[]>([])

let alpha = 0
const speed = 0.02
const threshold = 0.1

const onAnimationFrame = () => {
  let allRectsAtTarget = true

  const newRects: AnimationRectangle[] = []

  for (let i = 0; i < rects.value.length; i++) {
    const rect = rects.value[i]
    const newX = lerp(rect.x, rect.to.x, alpha)
    const newY = lerp(rect.y, rect.to.y, alpha)
    const newOpacity = lerp(rect.opacity, rect.to.opacity, alpha)

    const newScaleX = lerp(rect.scaleX, rect.to.scaleX, alpha)
    const newScaleY = lerp(rect.scaleY, rect.to.scaleY, alpha)

    // Check if the rectangle is at its target position
    if (
      Math.abs(newX - rect.to.x) > threshold ||
      Math.abs(newY - rect.to.y) > threshold ||
      Math.abs(newScaleX - rect.to.scaleX) > 0.01 ||
      Math.abs(newScaleY - rect.to.scaleY) > 0.01
    ) {
      allRectsAtTarget = false
    } else {
      animation.requestDraw()
    }

    newRects.push({
      ...rect,
      x: newX,
      y: newY,
      scaleX: newScaleX,
      scaleY: newScaleY,
      opacity: newOpacity,
    })
  }

  // Increase alpha towards 1 at each frame
  if (alpha < 1) {
    alpha += speed
  }

  if (allRectsAtTarget) {
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

onMounted(() => {
  const elRects = props.items.map((item, index) => {
    const element = (item.element.querySelector('.bk-drop-element') ||
      item.element) as HTMLElement
    return {
      rect: element.getBoundingClientRect(),
      element,
      hasDropElement: item.element !== element,
      item,
      index,
    }
  })

  // Find the matching bound rectangle that will determine the size of the box that is being dragged.
  const boundRect =
    elRects.find((v) =>
      isInsideRect(props.startCoords.x, props.startCoords.y, v.rect),
    ) || elRects[0]

  const bounds = boundRect.rect

  const boundsWidth = ui.isMobile.value ? 200 : Math.min(500, bounds.width)
  const ratio = boundsWidth / bounds.width
  const boundsHeight = bounds.height * ratio
  const boundsX = ui.isMobile.value
    ? 0
    : Math.max(
        Math.min(
          props.startCoords.x - boundsWidth / 2,
          bounds.x + bounds.width - boundsWidth,
        ),
        bounds.x,
      )
  const boundsY = ui.isMobile.value
    ? translateY.value
    : Math.max(
        Math.min(
          props.startCoords.y - boundsHeight / 2,
          bounds.y + bounds.height - boundsHeight,
        ),
        bounds.y,
      )

  offsetX.value = props.startCoords.x - boundsX
  offsetY.value = props.startCoords.y - boundsY
  width.value = boundsWidth
  height.value = boundsHeight

  rects.value = elRects.map((item) => {
    const isTop = item.index === boundRect.index
    const rect = item.rect
    const baseRect = item.item.element.getBoundingClientRect()
    const targetScaleX = Math.min(boundsWidth / item.element.scrollWidth, 1)
    const targetScaleY = Math.min(boundsHeight / item.element.scrollHeight, 1)

    const originX = 0
    // const originX = item.hasDropElement
    //   ? Math.min(props.startCoords.x - rect.x, rect.width)
    //   : 0
    const originY = 0

    const from: AnimationRectangleValues = {
      opacity: 0.9,
      scaleX: Math.min(baseRect.width / rect.width, 1),
      scaleY: Math.min(baseRect.height / rect.height, 1),
      x: ui.isMobile.value ? rect.x - translateX.value : rect.x - boundsX,
      y: ui.isMobile.value
        ? -rect.height -
          (window.innerHeight -
            boundsHeight -
            rect.y -
            rect.height +
            translateY.value)
        : rect.y - boundsY,
    }

    const to: AnimationRectangleValues = {
      opacity: isTop ? (ui.isMobile.value ? 1 : 0.6) : 0,
      x: props.startCoords.x - boundsX - offsetX.value,
      y: props.startCoords.y - boundsY - offsetY.value,
      scaleX: targetScaleX,
      scaleY: targetScaleY,
    }

    return {
      isTop,
      from,
      to,
      ...from,
      width: item.element.scrollWidth,
      height: item.element.scrollHeight,
      opacity: 0.9,

      transformOrigin: `${originX}px ${originY}px`,
      markup: dom.getDropElementMarkup(item.item),
      background: realBackgroundColor(item.element),
      elementOpacity:
        item.item.itemType === 'existing'
          ? item.element.style.opacity
          : undefined,
      element: item.element,
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
