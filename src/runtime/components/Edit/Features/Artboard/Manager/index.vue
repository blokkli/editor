<template>
  <PluginToolbarButton
    id="artboard_reset_zoom"
    :title="$t('artboardResetZoom', 'Reset zoom')"
    :shortcut-group="$t('artboard', 'Artboard')"
    :tour-text="
      $t(
        'artboardToolbarButtonTourText',
        'Shows the current zoom factor. Click on it to reset the zoom back to 100%.',
      )
    "
    icon="magnifier"
    meta
    key-code="0"
    region="view-options"
    weight="10"
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
      :style="scrollbarWrapperStyle"
      @mousedown.stop.prevent="onClickScrollbar"
    >
      <button
        :style="scrollbarStyle"
        @mousedown.capture.prevent.stop="onThumbMouseDown"
      />
    </div>
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
import type { Coord } from '#blokkli/types'
import { PluginToolbarButton } from '#blokkli/plugins'
import { lerp, calculateCenterPosition } from '#blokkli/helpers'
import { easeOutQuad } from '#blokkli/helpers/easing'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import defineShortcut from '#blokkli/helpers/composables/defineShortcut'

const { keyboard, dom, context, storage, ui, animation, $t, selection } =
  useBlokkli()

const scale = ui.artboardScale
const offset = ui.artboardOffset

const props = withDefaults(
  defineProps<{
    padding?: number
    minScale?: number
    maxScale?: number
    persist?: boolean
    scrollSpeed?: number
  }>(),
  {
    padding: 50,
    minScale: 0.05,
    maxScale: 3.5,
    scrollSpeed: 1,
  },
)

const debugValues = ref<any>({})

const scrollbar = ref<HTMLElement | null>(null)
const isDraggingThumb = ref(false)
const isTouchMoving = ref(false)

const scrollbarWrapperStyle = computed(() => ({
  right:
    Math.round(
      ui.viewport.value.width -
        ui.visibleViewportPadded.value.width -
        ui.visibleViewportPadded.value.x,
    ) + 'px',
}))

watch(selection.isDragging, () => {
  isTouchMoving.value = false
})

watch(isTouchMoving, (is) => {
  console.log('isTouchMoving: ' + is)
})

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
  const wrapperWidth = ui.artboardSize.value.width * targetScale
  const wrapperHeight = ui.artboardSize.value.height * targetScale
  const minX = -(wrapperWidth - props.padding)
  const maxX = ui.viewport.value.width - props.padding
  const minY = -(wrapperHeight - props.padding)
  const maxY = ui.viewport.value.height - props.padding
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

  zoomPoint.x = e.pageX
  zoomPoint.y = e.pageY

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
      offset.value.x + -(e.deltaX * props.scrollSpeed),
      offset.value.y + -(e.deltaY * props.scrollSpeed),
    )
  }
  animation.requestDraw()
}

function updateStyles() {
  ui.artboardElement().style.scale = scale.value.toString()
  ui.artboardElement().style.translate = `${Math.round(
    offset.value.x,
  )}px ${Math.round(offset.value.y)}px`
}

function resetZoom() {
  // Calculate the center of the viewport in the current scale.
  const viewportCenterY = ui.viewport.value.height / 2
  const currentCenterOnArtboard =
    (-offset.value.y + viewportCenterY) / scale.value

  // If the height of the artboard is smaller than the visible viewport height
  // always set the position in such a way that it is perfectly centered in the
  // viewport.
  if (ui.artboardSize.value.height < ui.visibleViewport.value.height) {
    const newYOffset =
      ui.visibleViewport.value.height / 2 - ui.artboardSize.value.height / 2
    return animateTo(getCenterX(1), newYOffset, 1)
  }

  // Calculate the new offset so that whatever is in the center of the
  // viewport remains the center after applying the scale.
  const newYOffset = Math.min(
    Math.max(
      -currentCenterOnArtboard + viewportCenterY,
      -ui.artboardSize.value.height + ui.viewport.value.height - props.padding,
    ),
    props.padding * 2,
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
    const diffX = startMoveoffset.x - e.clientX
    const diffY = startMoveoffset.y - e.clientY

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
  startMoveoffset.x = e.clientX
  startMoveoffset.y = e.clientY
  startMoveOffset.x = offset.value.x
  startMoveOffset.y = offset.value.y
  mouseIsDown.value = true
}

function onMouseUp() {
  mouseIsDown.value = false
  isDraggingThumb.value = false
  document.body.removeEventListener('mousemove', onThumbMouseMove)
}

defineShortcut(
  [
    {
      code: 'Home',
      label: $t('artboardScrollToTop', 'Scroll to top'),
    },
    {
      code: 'End',
      label: $t('artboardScrollToEnd', 'Scroll to end'),
    },
    {
      code: 'PageUp',
      label: $t('artboardScrollOnePageUp', 'Scroll one page up'),
    },
    {
      code: 'PageDown',
      label: $t('artboardScrollOnePageDown', 'Scroll one page down'),
    },
    {
      code: 'ArrowUp',
      label: $t('artboardScrollUp', 'Scroll up'),
    },
    {
      code: 'ArrowDown',
      label: $t('artboardScrollDown', 'Scroll down'),
    },
    {
      code: '1',
      label: $t('artboardScaleToFit', 'Scale to fit'),
      meta: true,
    },
  ].map((v) => {
    return { ...v, group: $t('artboard', 'Artboard') }
  }),
)

onBlokkliEvent('keyPressed', (e) => {
  if (e.code === 'Home') {
    scrollToTop()
  } else if (e.code === 'End') {
    scrollToEnd()
  } else if (e.code === 'PageUp') {
    scrollPageUp()
  } else if (e.code === 'PageDown') {
    scrollPageDown()
  } else if (e.code === 'ArrowUp') {
    animateOrJumpBy(200)
  } else if (e.code === 'ArrowDown') {
    animateOrJumpBy(-200)
  } else if (e.code === 'Digit0' && e.meta) {
    resetZoom()
  } else if (e.code === '1' && e.meta) {
    scaleToFit()
  }
})

const getEndY = () => {
  const artboardHeight = ui.artboardSize.value.height * ui.artboardScale.value
  return -artboardHeight + ui.viewport.value.height - props.padding
}

const animateOrJumpBy = (y: number) => {
  if (animationTarget.value) {
    updateAnimationTarget(animationTarget.value.x, animationTarget.value.y + y)
    alpha = 0.2
  } else {
    animateTo(offset.value.x, offset.value.y + y)
  }
}

const animateOrJumpTo = (y: number) => {
  if (animationTarget.value) {
    updateAnimationTarget(animationTarget.value.x, y)
    alpha = 0.2
  } else {
    animateTo(offset.value.x, y)
  }
}

const scrollPageUp = () =>
  animateOrJumpTo(
    Math.min(offset.value.y + ui.rootElement().offsetHeight, props.padding),
  )
const scrollPageDown = () =>
  animateOrJumpTo(
    Math.max(offset.value.y - ui.rootElement().offsetHeight, getEndY()),
  )
const scrollToTop = () => animateOrJumpTo(props.padding * 2)
const scrollToEnd = () => {
  animateOrJumpTo(getEndY())
}

function getCenterX(targetScale?: number): number {
  const scaleToUse = targetScale || scale.value
  return calculateCenterPosition(
    ui.viewportBlockingRects.value,
    ui.visibleViewport.value,
    ui.artboardElement().offsetWidth * scaleToUse,
  )
}

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

onBlokkliEvent('animationFrame:before', () => {
  if (animationTarget.value) {
    // Check if the current offset is close enough to the target offset
    if (
      !ui.useAnimations.value ||
      (Math.abs(offset.value.x - animationTarget.value.x) < 1 &&
        Math.abs(offset.value.y - animationTarget.value.y) < 1 &&
        Math.abs(scale.value - animationTarget.value.scale) < 0.02)
    ) {
      // We have reached our target.
      updateOffset(animationTarget.value.x, animationTarget.value.y)
      scale.value = animationTarget.value.scale
      stopAnimate()
    } else {
      const easedAlpha = easeOutQuad(alpha)
      // Update the offset values
      const x = lerp(offset.value.x, animationTarget.value.x, easedAlpha)
      const y = lerp(offset.value.y, animationTarget.value.y, easedAlpha)
      updateOffset(x, y)
      const newScale = lerp(
        scale.value,
        animationTarget.value.scale,
        easedAlpha,
      )
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
})

const zoomLevel = computed(
  () => Math.round((animationTarget.value?.scale || scale.value) * 100) + '%',
)

type SavedState = {
  offset: Coord
  scale: number
}

const storageKey = computed(() => 'artboard:' + context.value.entityUuid)
const savedState = storage.use<SavedState | null>(storageKey, null)

const touchStartOffset = { x: 0, y: 0 }

const initialTouchDistance = ref<number | null>(null)
const initialScale = ref(1)

function getDistance(a: Coord, b: Coord) {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

function getTouchDistance(touches: TouchList) {
  return getDistance(
    {
      x: touches[0].clientX,
      y: touches[0].clientY,
    },
    {
      x: touches[1].clientX,
      y: touches[1].clientY,
    },
  )
}

function onTouchStart(e: TouchEvent) {
  stopAnimate()
  isTouchMoving.value = true
  prevTouchMoveCoords = []
  if (e.touches.length === 1) {
    // Single touch (panning)
    touchStartOffset.x = e.touches[0].clientX
    touchStartOffset.y = e.touches[0].clientY
  } else if (e.touches.length === 2) {
    // Pinch start
    initialTouchDistance.value = getTouchDistance(e.touches)
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

type TouchCoord = Coord & { timestamp: number }

let isPinching = false
let prevTouchMoveCoords: TouchCoord[] = []

function onTouchMove(e: TouchEvent) {
  if (!isTouchMoving.value) {
    onTouchStart(e)
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
    const newTouchDistance = getTouchDistance(e.touches)
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

    const newTouchMoveCoord = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      timestamp: Date.now(),
    }
    if (prevTouchMoveCoords.length === 2) {
      prevTouchMoveCoords[0] = prevTouchMoveCoords[1]
      prevTouchMoveCoords[1] = newTouchMoveCoord
    } else {
      prevTouchMoveCoords.push(newTouchMoveCoord)
    }
    return
  }

  // Adjust offset based on new scale and focal point
  const newOffsetX = midpoint.x - focalPoint.x * newScale
  const newOffsetY = midpoint.y - focalPoint.y * newScale

  updateOffset(newOffsetX, newOffsetY)
}

function onTouchEnd(e: TouchEvent) {
  isTouchMoving.value = false
  if (e.touches.length <= 1) {
    // Reset initial values for pinch
    initialTouchDistance.value = null
    initialScale.value = 1
    if (prevTouchMoveCoords.length === 2) {
      const newPosition = calculateNewPosition(
        prevTouchMoveCoords,
        offset.value,
      )
      animateTo(newPosition.x, newPosition.y)
    }
    prevTouchMoveCoords = []
  }
}

// Method to calculate the new position
function calculateNewPosition(
  coords: TouchCoord[],
  position: Coord,
): Coord & { velocity: number } {
  if (coords.length !== 2) {
    throw new Error('Array must contain exactly two touch coordinates.')
  }

  const [firstTouch, secondTouch] = coords

  // Calculate differences in position and time
  const deltaX = secondTouch.x - firstTouch.x
  const deltaY = secondTouch.y - firstTouch.y
  const deltaTime = secondTouch.timestamp - firstTouch.timestamp

  if (deltaTime === 0) {
    throw new Error('Delta time is zero, cannot calculate velocity.')
  }

  const velocity = Math.sqrt(deltaX * deltaX + deltaY * deltaY) / deltaTime

  const angle = Math.atan2(deltaY, deltaX)

  const factor = 200
  return {
    x: position.x + Math.cos(angle) * velocity * factor,
    y: position.y + Math.sin(angle) * velocity * factor,
    velocity,
  }
}

const findElementToScrollTo = (uuid: string): HTMLElement | undefined => {
  try {
    const item = dom.findBlock(uuid)
    if (!item) {
      return
    }

    const element = item.element()
    if (!element) {
      return
    }

    return element
  } catch (_e) {
    // Noop.
  }
}

onBlokkliEvent('scrollIntoView', (e) => {
  const visibleBlocks = dom.getVisibleBlocks()

  // Return if block is already visible and centering was not requested.
  if (!e.center && visibleBlocks.includes(e.uuid)) {
    return
  }

  const element = findElementToScrollTo(e.uuid)
  if (!element) {
    return
  }

  const rect = element.getBoundingClientRect()
  const rectHeight = element.offsetHeight * scale.value

  let targetY: number | null = null
  const rootHeight = ui.visibleViewportPadded.value.height

  if (e.center) {
    targetY =
      offset.value.y - rect.y + props.padding + rootHeight / 2 - rectHeight / 2
  } else if (rect.y < 70) {
    targetY = offset.value.y - (rect.y - props.padding) + 70
  } else if (rect.y + rectHeight > rootHeight) {
    targetY = offset.value.y + (rootHeight - (rect.y + rectHeight) - 40)
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
})

const saveState = () => {
  if (!props.persist) {
    return
  }
  savedState.value = { offset: offset.value, scale: scale.value }
}

onMounted(() => {
  // Scroll to the top left to prevent overflow issues when artboard is enabled
  // /disabled (e.g. switching from mobile to destop viewport).
  window.scrollY = 0
  window.scrollX = 0
  document.body.addEventListener('mousedown', onMouseDown)
  window.addEventListener('mouseup', onMouseUp)

  document.addEventListener('touchmove', onTouchMove, { passive: false })
  document.addEventListener('touchend', onTouchEnd, { passive: false })
  document.documentElement.addEventListener('wheel', onWheel, {
    passive: false,
  })

  document.documentElement.classList.add('bk-is-artboard')
  window.addEventListener('beforeunload', saveState)

  if (savedState.value && props.persist) {
    offset.value.x = savedState.value.offset.x
    offset.value.y = savedState.value.offset.y
    updateScale(savedState.value.scale)
  } else {
    offset.value.x = getCenterX()
    offset.value.y = 20
  }
  updateStyles()
})

onBeforeUnmount(() => {
  document.body.removeEventListener('mousemove', onMouseMove)
  document.documentElement.removeEventListener('wheel', onWheel)
  document.body.removeEventListener('mousedown', onMouseDown)
  window.removeEventListener('mouseup', onMouseUp)
  document.removeEventListener('touchmove', onTouchMove)
  document.removeEventListener('touchend', onTouchEnd)
  document.documentElement.classList.remove('bk-is-artboard')
  // Store current canvas state in local storage.
  saveState()
})

onUnmounted(() => {
  ui.artboardElement().style.translate = ''
  ui.artboardElement().style.scale = ''
})
</script>

<script lang="ts">
export default {
  name: 'ArtboardManager',
}
</script>
