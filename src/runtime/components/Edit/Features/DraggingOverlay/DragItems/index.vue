<template>
  <Teleport to="body">
    <div class="bk-dragging-overlay" :style="style">
      <div
        v-for="(rect, i) in rects"
        :key="i"
        :class="{ 'bk-is-top': rect.isTop }"
        :style="{
          width: rect.width + 'px',
          height: rect.height + 'px',
          transform: `translate(${rect.x}px, ${rect.y}px) scale(${rect.scale})`,
          opacity: rect.opacity,
          background: rect.background,
        }"
        v-html="rect.markup"
      ></div>
    </div>
  </Teleport>
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
import type { DraggableItem, Rectangle } from '#blokkli/types'
import { isInsideRect, realBackgroundColor } from '#blokkli/helpers'

const { eventBus, dom, ui, animation } = useBlokkli()

const props = defineProps<{
  items: DraggableItem[]
  x: number
  y: number
}>()

const lerp = (s: number, e: number, t: number) => s * (1 - t) + e * t

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

type AnimationRectangle = Rectangle & {
  isTop: boolean
  targetOpacity: number
  opacity: number
  scale: number
  targetX: number
  targetY: number
  targetScale: number
  markup: string
  background: string
  elementOpacity?: string
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
    const newX = lerp(rect.x, rect.targetX, alpha)
    const newY = lerp(rect.y, rect.targetY, alpha)
    const newOpacity = lerp(rect.opacity, rect.targetOpacity, alpha)

    const newScale = lerp(rect.scale, rect.targetScale, alpha)

    // Check if the rectangle is at its target position
    if (
      Math.abs(newX - rect.targetX) > threshold ||
      Math.abs(newY - rect.targetY) > threshold ||
      Math.abs(newScale - rect.targetScale) > 0.01
    ) {
      allRectsAtTarget = false
    } else {
      animation.requestDraw()
    }

    newRects.push({
      ...rect,
      x: newX,
      y: newY,
      scale: newScale,
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
        opacity: v.targetOpacity,
        scale: v.targetScale,
        x: v.targetX,
        y: v.targetY,
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
      item,
      index,
    }
  })

  // Find the matching bound rectangle that will determine the size of the box that is being dragged.
  const boundRect =
    elRects.find((v) => isInsideRect(props.x, props.y, v.rect)) || elRects[0]

  const bounds = boundRect.rect

  const boundsWidth = ui.isMobile.value ? 200 : Math.min(500, bounds.width)
  const ratio = boundsWidth / bounds.width
  const boundsHeight = bounds.height * ratio
  const boundsX = ui.isMobile.value
    ? 0
    : Math.max(
        Math.min(
          props.x - boundsWidth / 2,
          bounds.x + bounds.width - boundsWidth,
        ),
        bounds.x,
      )
  const boundsY = ui.isMobile.value
    ? translateY.value
    : Math.max(
        Math.min(
          props.y - boundsHeight / 2,
          bounds.y + bounds.height - boundsHeight,
        ),
        bounds.y,
      )

  offsetX.value = props.x - boundsX
  offsetY.value = props.y - boundsY
  width.value = boundsWidth
  height.value = boundsHeight

  rects.value = elRects.map((item) => {
    const isTop = item.index === boundRect.index
    const rect = item.rect
    const targetScale = Math.min(boundsWidth / item.element.scrollWidth, 1)
    return {
      isTop,
      x: ui.isMobile.value ? rect.x - translateX.value : rect.x - boundsX,
      y: ui.isMobile.value
        ? -rect.height -
          (window.innerHeight -
            boundsHeight -
            rect.y -
            rect.height +
            translateY.value)
        : rect.y - boundsY,
      width: item.element.scrollWidth,
      height: item.element.scrollHeight,
      opacity: 1,
      targetOpacity: isTop ? (ui.isMobile.value ? 1 : 0.6) : 0,
      targetX: props.x - boundsX - offsetX.value,
      targetY: props.y - boundsY - offsetY.value,
      scale: rect.width / item.element.scrollWidth,
      targetScale,
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
