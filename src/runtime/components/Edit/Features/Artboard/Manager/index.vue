<template>
  <PluginToolbarButton
    :title="text('resetZoom')"
    meta
    key-code="0"
    region="before-sidebar"
    @click="resetZoom"
  >
    <div class="bk-feature-canvas-button">
      <span>{{ zoomLevel }}</span>
    </div>
  </PluginToolbarButton>
  <Teleport to="body">
    <div
      ref="scrollbar"
      class="bk-artboard-scrollbar"
      :class="{ 'bk-is-active': isDraggingThumb }"
      @mousedown.stop.prevent="onClickScrollbar"
    >
      <button
        :style="scrollbarStyle"
        @mousedown.capture.prevent.stop="onThumbMouseDown"
      />
    </div>

    <!-- <div class="artboard-debug"> -->
    <!--   <table> -->
    <!--     <tr v-for="[key, value] in Object.entries(debugValues)"> -->
    <!--       <th>{{ key }}</th> -->
    <!--       <td>{{ value }}</td> -->
    <!--     </tr> -->
    <!--   </table> -->
    <!-- </div> -->
  </Teleport>
</template>

<script lang="ts" setup>
import {
  watch,
  ref,
  computed,
  useBlokkli,
  onMounted,
  onBeforeUnmount,
  onUnmounted,
} from '#imports'

import type {
  KeyPressedEvent,
  ScrollIntoViewEvent,
  Coord,
} from '#blokkli/types'
import { PluginToolbarButton } from '#blokkli/plugins'

const {
  keyboard,
  eventBus,
  dom,
  context,
  storage,
  ui,
  animation,
  text,
  selection,
} = useBlokkli()

const hasItemSelected = computed(() => !!selection.uuids.value.length)

const props = withDefaults(
  defineProps<{
    padding?: number
    minScale?: number
    maxScale?: number
  }>(),
  {
    padding: 50,
    minScale: 0.05,
    maxScale: 3.5,
  },
)

const debugValues = ref<any>({})

const scrollbar = ref<HTMLElement | null>(null)
const isDraggingThumb = ref(false)

const scrollStartY = ref(0)
const scrollStartOffsetY = ref(0)
const thumbStartY = ref(0)

function onThumbMouseDown(e: MouseEvent) {
  isDraggingThumb.value = true
  scrollStartY.value = e.clientY
  scrollStartOffsetY.value = offset.value.y
  thumbStartY.value = thumbY.value
  animationTarget.value = null
  document.body.addEventListener('mousemove', onThumbMouseMove, {
    passive: false,
  })
}

function onThumbMouseMove(e: MouseEvent) {
  const diff = scrollStartY.value - e.clientY
  const newThumbY = Math.max(
    Math.min(-thumbStartY.value + diff, 0),
    -(scrollbarHeight.value - scrollThumbHeight.value),
  )
  offset.value.y = getOffsetFromThumb(newThumbY)
}

function onClickScrollbar(e: MouseEvent) {
  if (e.offsetY < thumbY.value) {
    scrollPageUp()
  } else {
    scrollPageDown()
  }
}

const scale = ref(1)
const offset = ref<Coord>({
  x: 0,
  y: 0,
})
const zoomTarget: Coord = { x: 0, y: 0 }
const zoomPoint: Coord = { x: 0, y: 0 }
const startMoveoffset: Coord = {
  x: 0,
  y: 0,
}

const startMoveOffset: Coord = {
  x: 0,
  y: 0,
}
const rootHeight = ref(1000)
const artboardHeight = ref(6000)
const scrollbarHeight = ref(0)

function getOffsetFromThumb(newThumbY: number): number {
  const maxThumbY = scrollbarHeight.value - scrollThumbHeight.value
  const newScrollProgress = newThumbY / maxThumbY
  const newScrollTop = newScrollProgress * scrollHeight.value
  const newOffsetY = newScrollTop + rootHeight.value - props.padding
  return newOffsetY
}

const scrollHeight = computed(
  () =>
    artboardHeight.value * scale.value + rootHeight.value - 2 * props.padding,
)

const scrollTop = computed(() =>
  Math.round(offset.value.y - rootHeight.value + props.padding),
)

// The scroll progress as a value from 0 to 1.
const scrollProgress = computed(() =>
  Math.abs(scrollTop.value / scrollHeight.value),
)

const scrollThumbHeight = computed(
  () => (rootHeight.value / scrollHeight.value) * rootHeight.value,
)

const thumbY = computed(
  () =>
    (scrollbarHeight.value - scrollThumbHeight.value) * scrollProgress.value,
)

const scrollbarStyle = computed(() => ({
  height: scrollThumbHeight.value + 'px',
  transform: `translateY(${thumbY.value}px)`,
}))

// The target state for the current animation.
const animationTarget = ref<(Coord & { scale: number }) | null>(null)

const limitOffset = (
  providedX: number,
  providedY: number,
  providedScale?: number,
): Coord => {
  const targetScale = providedScale || scale.value
  const rootRect = ui.rootElement().getBoundingClientRect()
  const wrapperHeight = ui.artboardElement().offsetHeight * targetScale
  const wrapperWidth = ui.artboardElement().offsetWidth * targetScale
  const minX = -(wrapperWidth - props.padding)
  const maxX = rootRect.width - props.padding
  const minY = -(wrapperHeight - props.padding)
  const maxY = rootRect.height - props.padding
  const x = Math.max(Math.min(providedX, maxX), minX)
  const y = Math.max(Math.min(providedY, maxY), minY)
  return { x, y }
}

function updateScale(newScale: number) {
  scale.value = Math.max(props.minScale, Math.min(props.maxScale, newScale))
  animation.requestDraw()
}

function updateOffset(x: number, y: number) {
  const limited = limitOffset(x, y)
  offset.value.x = limited.x
  offset.value.y = limited.y
  animation.requestDraw()
}

function updateAnimationTarget(newX: number, newY: number, newScale?: number) {
  const { x, y } = limitOffset(newX, newY, newScale)
  animationTarget.value = {
    x,
    y,
    scale: newScale || animationTarget.value?.scale || scale.value,
  }
}

const SCALE_BASE = 1.1

function onWheel(e: WheelEvent) {
  stopAnimate()
  e.preventDefault()

  const rect = ui.rootElement().getBoundingClientRect()
  zoomPoint.x = e.pageX - rect.left
  zoomPoint.y = e.pageY - rect.top

  if (e.ctrlKey) {
    zoomTarget.x = (zoomPoint.x - offset.value.x) / scale.value
    zoomTarget.y = (zoomPoint.y - offset.value.y) / scale.value

    const scaleFactor = Math.pow(SCALE_BASE, -Math.sign(e.deltaY) / 1.25)

    updateScale(scale.value * scaleFactor)
    updateOffset(
      -zoomTarget.x * scale.value + zoomPoint.x,
      -zoomTarget.y * scale.value + zoomPoint.y,
    )
  } else {
    updateOffset(
      offset.value.x + -(e.deltaX / 3),
      offset.value.y + -(e.deltaY / 3),
    )
  }
  animation.requestDraw()
}

function scaleToUnitRange(v: number, min: number, max: number): number {
  // Ensure v is within the range [min, max]
  if (v < min) {
    v = min
  } else if (v > max) {
    v = max
  }

  // Scale v to the range [0, 1]
  return (v - min) / (max - min)
}

const scaleProgress = computed(() => {
  return scaleToUnitRange(scale.value, props.minScale, props.maxScale)
})

const getOutlineWidth = () => {
  return Math.min(3 / scale.value, 7)
}

const getRadius = () => {
  return 3 * scaleProgress.value
}

function updateStyles() {
  ui.artboardElement().style.scale = scale.value.toString()
  ui.artboardElement().style.translate = `${Math.round(
    offset.value.x,
  )}px ${Math.round(offset.value.y)}px`

  document.documentElement.style.setProperty(
    '--bk-outline-width',
    getOutlineWidth().toString(),
  )

  document.documentElement.style.setProperty(
    '--bk-radius',
    getRadius().toString(),
  )

  document.documentElement.style.setProperty(
    '--bk-artboard-scale',
    scale.value.toString(),
  )
}

function resetZoom() {
  const artboard = ui.artboardElement()
  const root = ui.rootElement()
  // Calculate the center of the viewport in the current scale.
  const viewportCenterY = root.offsetHeight / 2
  const currentCenterOnArtboard =
    (-offset.value.y + viewportCenterY) / scale.value

  // Calculate the new offset so that whatever is in the center of the
  // viewport remains the center after applying the scale.
  const newYOffset = Math.min(
    Math.max(
      -currentCenterOnArtboard + viewportCenterY,
      -artboard.offsetHeight + root.offsetHeight - props.padding,
    ),
    props.padding,
  )
  animateTo(getCenterX(1), newYOffset, 1)
}

function scaleToFit() {
  const canvasHeight = ui.artboardElement().offsetHeight
  const rootHeight = ui.rootElement().offsetHeight

  const targetScale = (rootHeight - props.padding) / canvasHeight
  animateTo(getCenterX(targetScale), props.padding / 2, targetScale)
}

watch(keyboard.isPressingSpace, (isPressing) => {
  if (isPressing) {
    startMoveOffset.x = offset.value.x
    startMoveOffset.y = offset.value.y
    document.body.addEventListener('mousemove', onMouseMove, {
      passive: false,
    })
  } else {
    document.body.removeEventListener('mousemove', onMouseMove)
  }
})

function onMouseMove(e: MouseEvent) {
  if (mouseIsDown.value) {
    // e.preventDefault()
    const diffX = startMoveoffset.x - e.x
    const diffY = startMoveoffset.y - e.y

    updateOffset(startMoveOffset.x - diffX, startMoveOffset.y - diffY)
  }
}

const mouseIsDown = ref(false)

function onMouseDown(e: MouseEvent) {
  if (!keyboard.isPressingSpace.value) {
    return
  }
  e.preventDefault()
  e.stopPropagation()
  startMoveoffset.x = e.x
  startMoveoffset.y = e.y
  startMoveOffset.x = offset.value.x
  startMoveOffset.y = offset.value.y
  mouseIsDown.value = true
}

function onMouseUp() {
  mouseIsDown.value = false
  isDraggingThumb.value = false
  document.body.removeEventListener('mousemove', onThumbMouseMove)
}

function onKeyPressed(e: KeyPressedEvent) {
  if (e.code === 'Home') {
    scrollToTop()
  } else if (e.code === 'End') {
    scrollToEnd()
  } else if (e.code === 'PageUp') {
    scrollPageUp()
  } else if (e.code === 'PageDown') {
    scrollPageDown()
  } else if (e.code === 'ArrowUp') {
    // Already animating, skip animation.
    if (animationTarget.value) {
      updateAnimationTarget(
        animationTarget.value.x,
        animationTarget.value.y + 200,
      )
      alpha = 0.2
    } else {
      animateTo(offset.value.x, offset.value.y + 200)
    }
  } else if (e.code === 'ArrowDown') {
    if (animationTarget.value) {
      updateAnimationTarget(
        animationTarget.value.x,
        animationTarget.value.y - 200,
      )
      alpha = 0.2
    } else {
      animateTo(offset.value.x, offset.value.y - 200)
    }
  } else if (e.code === 'Digit0' && e.meta) {
    resetZoom()
  } else if (e.code === '1' && e.meta) {
    scaleToFit()
  }
}

const getEndY = () => {
  const rect = ui.rootElement().getBoundingClientRect()
  const wrapperRect = ui.artboardElement().getBoundingClientRect()
  return -wrapperRect.height + rect.height - props.padding
}

const scrollPageUp = () =>
  animateTo(
    offset.value.x,
    Math.min(offset.value.y + ui.rootElement().offsetHeight, props.padding),
  )
const scrollPageDown = () =>
  animateTo(
    offset.value.x,
    Math.max(offset.value.y - ui.rootElement().offsetHeight, getEndY()),
  )
const scrollToTop = () => animateTo(offset.value.x, props.padding)
const scrollToEnd = () => {
  animateTo(offset.value.x, getEndY())
}

function getCenterX(targetScale?: number): number {
  const scaleToUse = targetScale || scale.value
  return (
    (ui.rootElement().offsetWidth -
      ui.artboardElement().offsetWidth * scaleToUse) /
    2
  )
}

const lerp = (s: number, e: number, t: number) => s * (1 - t) + e * t

let alpha = 0
const speed = 0.01

const animateTo = (x: number, y: number, targetScale?: number) => {
  updateAnimationTarget(x, y, targetScale || scale.value)
  alpha = 0
  animation.requestDraw()
}

const stopAnimate = () => {
  animationTarget.value = null
  alpha = 0
  animation.requestDraw()
}

function onAnimationFrame() {
  if (animationTarget.value) {
    // Check if the current offset is close enough to the target offset
    if (
      Math.abs(offset.value.x - animationTarget.value.x) < 1 &&
      Math.abs(offset.value.y - animationTarget.value.y) < 1 &&
      Math.abs(scale.value - animationTarget.value.scale) < 0.02
    ) {
      // We have reached our target.
      updateOffset(animationTarget.value.x, animationTarget.value.y)
      scale.value = animationTarget.value.scale
      stopAnimate()
    } else {
      // Update the offset values
      const x = lerp(offset.value.x, animationTarget.value.x, alpha)
      const y = lerp(offset.value.y, animationTarget.value.y, alpha)
      updateOffset(x, y)
      const newScale = lerp(scale.value, animationTarget.value.scale, alpha)
      scale.value = newScale

      // Increase alpha towards 1 at each frame
      if (alpha < 1) {
        alpha += speed
      }
    }
    animation.requestDraw()
  }
  const artboard = ui.artboardElement()
  rootHeight.value = ui.rootElement().offsetHeight
  artboardHeight.value = artboard.offsetHeight
  if (scrollbar.value) {
    scrollbarHeight.value = scrollbar.value.offsetHeight
  }

  updateStyles()
}

const zoomLevel = computed(
  () => Math.round((animationTarget.value?.scale || scale.value) * 100) + '%',
)

type SavedState = {
  offset: Coord
  scale: number
}

const storageKey = computed(() => 'artboard:' + context.value.entityUuid)
const savedState = storage.use<SavedState | null>(storageKey, null)

const shouldPersist = storage.use('persistArtboard', true)

const touchStartOffset = { x: 0, y: 0 }

const initialTouchDistance = ref<number | null>(null)
const initialScale = ref(1)

function getDistance(touches: TouchList) {
  const dx = touches[0].clientX - touches[1].clientX
  const dy = touches[0].clientY - touches[1].clientY
  return Math.sqrt(dx * dx + dy * dy)
}

function onTouchStart(e: TouchEvent) {
  if (hasItemSelected.value) {
    return
  }
  if (e.touches.length === 1) {
    // Single touch (panning)
    touchStartOffset.x = e.touches[0].clientX
    touchStartOffset.y = e.touches[0].clientY
  } else if (e.touches.length === 2) {
    // Pinch start
    initialTouchDistance.value = getDistance(e.touches)
    initialScale.value = scale.value
  }
}

function getMidpoint(touches: TouchList) {
  const x = touches[0].clientX
  const y = touches[0].clientY
  if (touches.length === 1) {
    return {
      x,
      y,
    }
  }
  return {
    x: (x + touches[1].clientX) / 2,
    y: (y + touches[1].clientY) / 2,
  }
}

let isPinching = false

function onTouchMove(e: TouchEvent) {
  if (hasItemSelected.value) {
    return
  }
  e.preventDefault()
  e.stopPropagation()
  // Calculate midpoint
  const midpoint = getMidpoint(e.touches)
  const focalPoint = {
    x: (midpoint.x - offset.value.x) / scale.value,
    y: (midpoint.y - offset.value.y) / scale.value,
  }

  let newScale = 1

  if (e.touches.length === 2 && initialTouchDistance.value !== null) {
    isPinching = true
    // Pinch move
    const newTouchDistance = getDistance(e.touches)
    const scaleFactor = newTouchDistance / initialTouchDistance.value

    newScale = initialScale.value * scaleFactor

    updateScale(newScale)
    debugValues.value = {
      newTouchDistance,
      scaleFactor,
      scale: scale.value,
      x: offset.value.x,
      y: offset.value.y,
    }
  } else if (e.touches.length === 1 && initialTouchDistance.value === null) {
    if (isPinching) {
      touchStartOffset.x = e.touches[0].clientX
      touchStartOffset.y = e.touches[0].clientY
      isPinching = false
      return
    }
    // Single touch move (panning)
    const diffX = touchStartOffset.x - e.touches[0].clientX
    const diffY = touchStartOffset.y - e.touches[0].clientY

    updateOffset(offset.value.x - diffX, offset.value.y - diffY)

    touchStartOffset.x = e.touches[0].clientX
    touchStartOffset.y = e.touches[0].clientY
    return
  }

  // Adjust offset based on new scale and focal point
  const newOffsetX = midpoint.x - focalPoint.x * newScale
  const newOffsetY = midpoint.y - focalPoint.y * newScale
  updateOffset(newOffsetX, newOffsetY)
}

function onTouchEnd(e: TouchEvent) {
  if (e.touches.length <= 1) {
    // Reset initial values for pinch
    initialTouchDistance.value = null
    initialScale.value = 1
  }
}

function onScrollIntoView(e: ScrollIntoViewEvent) {
  const item = dom.findBlock(e.uuid)
  if (!item) {
    return
  }

  const rect = item.element.getBoundingClientRect()

  let targetY: number | null = null
  const rootHeight = ui.rootElement().offsetHeight

  if (e.center) {
    targetY =
      offset.value.y - rect.y + props.padding + rootHeight / 2 - rect.height / 2
  } else if (rect.y < 70) {
    targetY = offset.value.y - (rect.y - props.padding) + 70
  } else if (rect.y + rect.height > rootHeight) {
    targetY = offset.value.y + (rootHeight - (rect.y + rect.height) - 40)
  }

  if (targetY) {
    if (e.immediate || animationTarget.value) {
      if (animationTarget.value) {
        animationTarget.value.y = targetY
      }
      offset.value.y = targetY
    } else {
      animateTo(offset.value.x, targetY)
    }
  }
}

const saveState = () => {
  if (!shouldPersist.value) {
    return
  }
  savedState.value = { offset: offset.value, scale: scale.value }
}

onMounted(() => {
  document.body.addEventListener('mousedown', onMouseDown)
  window.addEventListener('mouseup', onMouseUp)

  document.addEventListener('touchstart', onTouchStart, { passive: false })
  document.addEventListener('touchmove', onTouchMove, { passive: false })
  document.addEventListener('touchend', onTouchEnd, { passive: false })
  document.body.addEventListener('wheel', onWheel, { passive: false })

  eventBus.on('scrollIntoView', onScrollIntoView)
  eventBus.on('keyPressed', onKeyPressed)
  eventBus.on('animationFrame:before', onAnimationFrame)
  document.documentElement.classList.add('bk-is-artboard')
  window.addEventListener('beforeunload', saveState)

  if (savedState.value && shouldPersist.value) {
    offset.value.x = savedState.value.offset.x
    offset.value.y = savedState.value.offset.y
    updateScale(savedState.value.scale)
  }
  updateStyles()
})

onBeforeUnmount(() => {
  document.body.removeEventListener('mousemove', onMouseMove)
  document.body.removeEventListener('wheel', onWheel)
  document.body.removeEventListener('mousedown', onMouseDown)
  window.removeEventListener('mouseup', onMouseUp)
  document.removeEventListener('touchstart', onTouchStart)
  document.removeEventListener('touchmove', onTouchMove)
  document.removeEventListener('touchend', onTouchEnd)
  eventBus.off('scrollIntoView', onScrollIntoView)
  eventBus.off('keyPressed', onKeyPressed)
  eventBus.off('animationFrame:before', onAnimationFrame)
  document.documentElement.classList.remove('bk-is-artboard')
  // Store current canvas state in local storage.
  saveState()
})

onUnmounted(() => {
  ui.artboardElement().style.translate = ''
  ui.artboardElement().style.scale = ''
  document.documentElement.style.setProperty('--bk-outline-width', null)

  document.documentElement.style.setProperty('--bk-radius', null)

  document.documentElement.style.setProperty('--bk-artboard-scale', null)
})
</script>

<style>
.artboard-debug {
  position: fixed;
  z-index: 9999999999;
  left: 0;
  bottom: 0;
  width: 100%;
  background: white;
  padding: 1rem;
}
</style>
