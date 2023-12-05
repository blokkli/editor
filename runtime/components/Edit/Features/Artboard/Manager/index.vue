<template>
  <PluginToolbarButton
    title="Zoom zurücksetzen"
    meta
    key-code="0"
    region="before-sidebar"
    @click="resetZoom"
  >
    <div class="pb-feature-canvas-button">
      <span>{{ zoomLevel }}</span>
    </div>
  </PluginToolbarButton>
</template>

<script lang="ts" setup>
import { KeyPressedEvent, ParagraphScrollIntoViewEvent } from '#pb/types'
import { PluginToolbarButton } from '#pb/plugins'

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

type Coord = {
  x: number
  y: number
}

const zoomFactor = 0.1
const scale = ref(1)
const offset: Coord = {
  x: 0,
  y: 0,
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

// The target state for the current animation.
const animationTarget = ref<(Coord & { scale: number }) | null>(null)

const { keyboard, eventBus, dom, context, storage, ui, animation } =
  useBlokkli()

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
  offset.x = limited.x
  offset.y = limited.y
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

function onWheel(e: WheelEvent) {
  stopAnimate()
  e.preventDefault()

  const rect = ui.rootElement().getBoundingClientRect()
  zoomPoint.x = e.pageX - rect.left
  zoomPoint.y = e.pageY - rect.top

  if (e.ctrlKey) {
    const delta = Math.sign(-e.deltaY)
    zoomTarget.x = (zoomPoint.x - offset.x) / scale.value
    zoomTarget.y = (zoomPoint.y - offset.y) / scale.value

    updateScale(scale.value + delta * zoomFactor * scale.value)
    updateOffset(
      -zoomTarget.x * scale.value + zoomPoint.x,
      -zoomTarget.y * scale.value + zoomPoint.y,
    )
  } else {
    updateOffset(offset.x + -(e.deltaX / 3), offset.y + -(e.deltaY / 3))
  }
  animation.requestDraw()
}

function updateStyles() {
  ui.artboardElement().style.scale = scale.value.toString()
  ui.artboardElement().style.translate = `${Math.round(
    offset.x,
  )}px ${Math.round(offset.y)}px`
}

function resetZoom() {
  const artboard = ui.artboardElement()
  const root = ui.rootElement()
  // Calculate the center of the viewport in the current scale.
  const viewportCenterY = root.offsetHeight / 2
  const currentCenterOnArtboard = (-offset.y + viewportCenterY) / scale.value

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
    startMoveOffset.x = offset.x
    startMoveOffset.y = offset.y
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
  startMoveOffset.x = offset.x
  startMoveOffset.y = offset.y
  mouseIsDown.value = true
}

function onMouseUp() {
  mouseIsDown.value = false
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
      animateTo(offset.x, offset.y + 200)
    }
  } else if (e.code === 'ArrowDown') {
    if (animationTarget.value) {
      updateAnimationTarget(
        animationTarget.value.x,
        animationTarget.value.y - 200,
      )
      alpha = 0.2
    } else {
      animateTo(offset.x, offset.y - 200)
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
    offset.x,
    Math.min(offset.y + ui.rootElement().offsetHeight, props.padding),
  )
const scrollPageDown = () =>
  animateTo(
    offset.x,
    Math.max(offset.y - ui.rootElement().offsetHeight, getEndY()),
  )
const scrollToTop = () => animateTo(offset.x, props.padding)
const scrollToEnd = () => {
  animateTo(offset.x, getEndY())
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
      Math.abs(offset.x - animationTarget.value.x) < 1 &&
      Math.abs(offset.y - animationTarget.value.y) < 1 &&
      Math.abs(scale.value - animationTarget.value.scale) < 0.02
    ) {
      // We have reached our target.
      updateOffset(animationTarget.value.x, animationTarget.value.y)
      scale.value = animationTarget.value.scale
      stopAnimate()
    } else {
      // Update the offset values
      const x = lerp(offset.x, animationTarget.value.x, alpha)
      const y = lerp(offset.y, animationTarget.value.y, alpha)
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

let touchStartOffset = { x: 0, y: 0 }
let lastTouchDistance: number = 0

function onTouchStart(e: TouchEvent) {
  if (e.touches.length === 1) {
    // Single touch (panning)
    touchStartOffset.x = e.touches[0].clientX
    touchStartOffset.y = e.touches[0].clientY
  } else if (e.touches.length === 2) {
    // Two fingers (pinch zooming)
    lastTouchDistance = getDistanceBetweenTouches(e)
  }
}

function onTouchMove(e: TouchEvent) {
  e.preventDefault()
  if (e.touches.length === 1 && !lastTouchDistance) {
    // Single touch move (panning)
    const diffX = touchStartOffset.x - e.touches[0].clientX
    const diffY = touchStartOffset.y - e.touches[0].clientY

    updateOffset(offset.x - diffX, offset.y - diffY)

    touchStartOffset.x = e.touches[0].clientX
    touchStartOffset.y = e.touches[0].clientY
  } else if (e.touches.length === 2) {
    // Pinch zoom
    const currentDistance = getDistanceBetweenTouches(e)
    const delta = currentDistance - lastTouchDistance

    // Determine zoom factor based on the change in distance between touches
    const zoomChange = delta * zoomFactor

    lastTouchDistance = currentDistance
  }
}

function onTouchEnd(e: TouchEvent) {
  lastTouchDistance = 0
}

function getDistanceBetweenTouches(e: TouchEvent) {
  const touch1 = e.touches[0]
  const touch2 = e.touches[1]
  return Math.sqrt(
    Math.pow(touch2.clientX - touch1.clientX, 2) +
      Math.pow(touch2.clientY - touch1.clientY, 2),
  )
}

function onParagraphScrollIntoView(e: ParagraphScrollIntoViewEvent) {
  const item = dom.findBlock(e.uuid)
  if (!item) {
    return
  }

  const rect = item.element.getBoundingClientRect()

  let targetY: number | null = null
  const rootHeight = ui.rootElement().offsetHeight

  if (e.center) {
    targetY =
      offset.y - rect.y + props.padding + rootHeight / 2 - rect.height / 2
  } else if (rect.y < 70) {
    targetY = offset.y - (rect.y - props.padding) + 70
  } else if (rect.y + rect.height > rootHeight) {
    targetY = offset.y + (rootHeight - (rect.y + rect.height) - 40)
  }

  if (targetY) {
    if (e.immediate || animationTarget.value) {
      if (animationTarget.value) {
        animationTarget.value.y = targetY
      }
      offset.y = targetY
    } else {
      animateTo(offset.x, targetY)
    }
  }
}

const saveState = () => {
  if (!shouldPersist.value) {
    return
  }
  savedState.value = { offset, scale: scale.value }
}

onMounted(() => {
  document.body.addEventListener('mousedown', onMouseDown)
  window.addEventListener('mouseup', onMouseUp)

  window.addEventListener('touchstart', onTouchStart, { passive: false })
  window.addEventListener('touchmove', onTouchMove, { passive: false })
  window.addEventListener('touchend', onTouchEnd, { passive: false })
  document.body.addEventListener('wheel', onWheel, { passive: false })

  eventBus.on('paragraph:scrollIntoView', onParagraphScrollIntoView)
  eventBus.on('keyPressed', onKeyPressed)
  eventBus.on('animationFrame:before', onAnimationFrame)
  document.documentElement.classList.add('pb-is-artboard')
  window.addEventListener('beforeunload', saveState)

  if (savedState.value && shouldPersist.value) {
    offset.x = savedState.value.offset.x
    offset.y = savedState.value.offset.y
    updateScale(savedState.value.scale)
  }
  updateStyles()
})

onBeforeUnmount(() => {
  document.body.removeEventListener('mousemove', onMouseMove)
  document.body.removeEventListener('wheel', onWheel)
  document.body.removeEventListener('mousedown', onMouseDown)
  window.removeEventListener('mouseup', onMouseUp)
  window.removeEventListener('touchstart', onTouchStart)
  window.removeEventListener('touchmove', onTouchMove)
  window.removeEventListener('touchend', onTouchEnd)
  eventBus.off('paragraph:scrollIntoView', onParagraphScrollIntoView)
  eventBus.off('keyPressed', onKeyPressed)
  eventBus.off('animationFrame:before', onAnimationFrame)
  document.documentElement.classList.remove('pb-is-artboard')
  // Store current canvas state in local storage.
  saveState()
})

onUnmounted(() => {
  ui.artboardElement().style.translate = ''
  ui.artboardElement().style.scale = ''
})
</script>
