<template>
  <PluginToolbarButton
    title="Zoom zurücksetzen"
    meta
    key-code="0"
    region="before-sidebar"
    @click="resetZoom"
  >
    <div class="pb-feature-canvas-button">
      <Icon name="magnifier" />
      <span>{{ zoomLevel }}</span>
    </div>
  </PluginToolbarButton>
</template>

<script lang="ts" setup>
import { buildDraggableItem } from '#pb/helpers'
import { KeyPressedEvent } from '#pb/types'
import { Icon } from '#pb/components'
import { PluginToolbarButton } from '#pb/plugins'

type Coord = {
  x: number
  y: number
}

let wrapperEl: HTMLElement | null = null
let nuxtRootEl: HTMLElement | null = null
const mouseX = ref(0)
const mouseY = ref(0)
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

const animationTarget = ref<(Coord & { scale: number }) | null>(null)

const { isPressingSpace, eventBus } = useParagraphsBuilderStore()

const previewOpen = ref(false)

watch(previewOpen, (isOpen) => {
  if (isOpen) {
    nuxtRootEl?.classList.add('pb-has-preview-open')
  } else {
    nuxtRootEl?.classList.remove('pb-has-preview-open')
  }
})

function updateOffset(x: number, y: number) {
  if (nuxtRootEl && wrapperEl) {
    const rootRect = nuxtRootEl.getBoundingClientRect()
    const wrapperHeight = wrapperEl.offsetHeight * scale.value
    const wrapperWidth = wrapperEl.offsetWidth * scale.value
    const minX = -(wrapperWidth - 50)
    const maxX = rootRect.width - 50
    const minY = -(wrapperHeight - 50)
    const maxY = rootRect.height - 50
    offset.x = Math.max(Math.min(x, maxX), minX)
    offset.y = Math.max(Math.min(y, maxY), minY)
  }
}

function onWheel(e: WheelEvent) {
  stopAnimate()
  e.preventDefault()
  if (!wrapperEl || !nuxtRootEl) {
    return
  }

  const rect = nuxtRootEl.getBoundingClientRect()
  zoomPoint.x = e.pageX - rect.left
  zoomPoint.y = e.pageY - rect.top

  if (e.ctrlKey) {
    const delta = Math.sign(-e.deltaY)
    zoomTarget.x = (zoomPoint.x - offset.x) / scale.value
    zoomTarget.y = (zoomPoint.y - offset.y) / scale.value

    scale.value = Math.max(
      0.1,
      Math.min(3, scale.value + delta * zoomFactor * scale.value),
    )

    updateOffset(
      -zoomTarget.x * scale.value + zoomPoint.x,
      -zoomTarget.y * scale.value + zoomPoint.y,
    )
  } else {
    updateOffset(offset.x + -(e.deltaX / 3), offset.y + -(e.deltaY / 3))
  }
}

function updateStyles() {
  if (wrapperEl) {
    wrapperEl.style.scale = scale.value.toString()
    wrapperEl.style.translate = `${Math.round(offset.x)}px ${Math.round(
      offset.y,
    )}px`
  }
}

function resetZoom() {
  const canvasHeight = wrapperEl?.offsetHeight
  if (!canvasHeight) {
    return
  }
  // Calculate the ideal y position for the current offset.
  const targetY =
    window.innerHeight / 2 - (window.innerHeight / 2 - offset.y) / scale.value

  // Make sure the canvas has a maximum distance to the top and bottom of the screen of 70px.
  const y = Math.min(
    Math.max(targetY, -(canvasHeight - window.innerHeight + 120)),
    70,
  )
  animateTo(getCenterX(1), y, 1)
}

function scaleToFit() {
  const canvasHeight = wrapperEl?.offsetHeight
  if (!canvasHeight) {
    return
  }

  const targetScale = (window.innerHeight - 50 - 60) / canvasHeight
  animateTo(getCenterX(targetScale), 30, targetScale)
}

watch(isPressingSpace, (isPressing) => {
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
    if (wrapperEl && nuxtRootEl) {
      const diffX = startMoveoffset.x - e.x
      const diffY = startMoveoffset.y - e.y

      updateOffset(startMoveOffset.x - diffX, startMoveOffset.y - diffY)
    }
  }
}

const mouseIsDown = ref(false)

function onMouseDown(e: MouseEvent) {
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
  if (!wrapperEl || !nuxtRootEl) {
    return
  }
  if (e.code === 'PageUp') {
    scrollToTop()
  } else if (e.code === 'PageDown') {
    const rect = nuxtRootEl.getBoundingClientRect()
    animateTo(offset.x, -wrapperEl.offsetHeight + rect.height - 50)
  } else if (e.code === 'ArrowUp') {
    if (animationTarget.value) {
      animationTarget.value.y += 200
    } else {
      animateTo(offset.x, offset.y + 200)
    }
  } else if (e.code === 'ArrowDown') {
    if (animationTarget.value) {
      animationTarget.value.y -= 200
    } else {
      animateTo(offset.x, offset.y - 200)
    }
  } else if (e.code === 'Digit0' && e.meta) {
    resetZoom()
  } else if (e.code === 'f' && e.meta) {
    scaleToFit()
  }
}

function scrollToTop() {
  animateTo(offset.x, 50)
}

function getCenterX(targetScale?: number): number {
  const scaleToUse = targetScale || scale.value
  if (wrapperEl) {
    return (window.innerWidth - 70 - wrapperEl.offsetWidth * scaleToUse) / 2
  }
  return 0
}

function lerp(start: number, end: number, t: number) {
  return start * (1 - t) + end * t
}

let alpha = 0
const speed = 0.01 // Animation speed

const animateTo = (x: number, y: number, targetScale?: number) => {
  animationTarget.value = { x, y, scale: targetScale || scale.value }
  alpha = 0
}

const stopAnimate = () => {
  animationTarget.value = null
  alpha = 0
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
  }

  updateStyles()
}

const zoomLevel = computed(
  () => Math.round((animationTarget.value?.scale || scale.value) * 100) + '%',
)

/**
 * Restore the last canvas state if possible.
 */
function setInitState() {
  const stored = window.localStorage.getItem('pb_canvas')
  if (stored) {
    try {
      const values = JSON.parse(stored)
      if (
        values &&
        typeof values.scale === 'number' &&
        typeof values.offset.x === 'number' &&
        typeof values.offset.y === 'number'
      ) {
        scale.value = values.scale
        offset.x = values.offset.x
        offset.y = values.offset.y
        return
      }
    } catch (_e) {}
  }

  updateOffset(getCenterX(), 50)
}

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

function onParagraphScrollIntoView(uuid: string) {
  const el = document.querySelector(`[data-uuid="${uuid}"]`)
  if (!(el instanceof HTMLElement)) {
    return
  }
  const item = buildDraggableItem(el)
  if (item?.itemType !== 'existing') {
    return
  }

  const rect = item.element.getBoundingClientRect()
  animateTo(
    offset.x,
    offset.y - rect.y + 50 + window.innerHeight / 2 - rect.height / 2,
  )
}

onMounted(() => {
  wrapperEl = document.querySelector('.pb-main-canvas')
  nuxtRootEl = document.querySelector('#nuxt-root')
  window.addEventListener('mousedown', onMouseDown)
  window.addEventListener('mouseup', onMouseUp)

  window.addEventListener('touchstart', onTouchStart, { passive: false })
  window.addEventListener('touchmove', onTouchMove, { passive: false })
  window.addEventListener('touchend', onTouchEnd, { passive: false })
  document.body.addEventListener('wheel', onWheel, { passive: false })

  eventBus.on('paragraph:scrollIntoView', onParagraphScrollIntoView)
  eventBus.on('keyPressed', onKeyPressed)
  eventBus.on('animationFrame:before', onAnimationFrame)
  setInitState()
  updateStyles()
  document.documentElement.classList.add('pb-is-artboard')
})

onBeforeUnmount(() => {
  // Store current canvas state in local storage.
  window.localStorage.setItem(
    'pb_canvas',
    JSON.stringify({
      scale: scale.value,
      offset: offset,
    }),
  )
})

onUnmounted(() => {
  document.body.removeEventListener('mousemove', onMouseMove)
  document.body.removeEventListener('wheel', onWheel)
  window.removeEventListener('mousedown', onMouseDown)
  window.removeEventListener('mouseup', onMouseUp)
  window.removeEventListener('touchstart', onTouchStart)
  window.removeEventListener('touchmove', onTouchMove)
  window.removeEventListener('touchend', onTouchEnd)
  nuxtRootEl?.classList.remove('pb-has-sidebar-open')
  nuxtRootEl?.classList.remove('pb-has-preview-open')
  eventBus.off('paragraph:scrollIntoView', onParagraphScrollIntoView)
  eventBus.off('keyPressed', onKeyPressed)
  eventBus.off('animationFrame:before', onAnimationFrame)
  document.documentElement.classList.remove('pb-is-artboard')
  if (wrapperEl) {
    wrapperEl.style.transform = ''
    wrapperEl.style.scale = ''
  }
})
</script>
