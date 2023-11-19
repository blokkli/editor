<template>
  <PluginToolbarButton
    title="Zoom zurücksetzen"
    meta
    key-code="0"
    region="before-sidebar"
    @click="resetZoom"
  >
    <IconMagnifier />
    <span>{{ zoomLevel }}</span>
  </PluginToolbarButton>
</template>

<script lang="ts" setup>
import { eventBus } from '../../eventBus'
import { falsy } from '../../helpers'
import IconMagnifier from './../../Icons/Magnifier.vue'
import PluginToolbarButton from './../../Plugin/ToolbarButton/index.vue'

let resetTimeout: any = null

function resetZoom() {
  clearTimeout(resetTimeout)
  const y = offset.y / scale.value
  scale.value = 1
  updateOffset(offset.x, y)
  updateStyles()
  updateOffset(getCenterX(), 50)
}

const zoomLevel = computed(() => {
  return Math.round(scale.value * 100) + '%'
})

let wrapperEl: HTMLElement | null = null
let nuxtRootEl: HTMLElement | null = null
let sidebarEl: HTMLElement | null = null

const { isPressingSpace } = useParagraphsBuilderStore()

const previewOpen = ref(false)
const sidebarOpen = ref(false)

watch(previewOpen, (isOpen) => {
  if (isOpen) {
    nuxtRootEl?.classList.add('pb-has-preview-open')
  } else {
    nuxtRootEl?.classList.remove('pb-has-preview-open')
  }
})

const zoomFactor = 0.1
const scale = ref(1)
const offset = {
  x: 0,
  y: 0,
}

function updateOffset(x: number, y: number) {
  if (nuxtRootEl && wrapperEl) {
    const rootRect = nuxtRootEl.getBoundingClientRect()
    const wrapperRect = wrapperEl.getBoundingClientRect()
    const minX = -(wrapperRect.width - 50)
    const maxX = rootRect.width - 50
    const minY = -(wrapperRect.height - 50)
    const maxY = rootRect.height - 50
    offset.x = Math.max(Math.min(x, maxX), minX)
    offset.y = Math.max(Math.min(y, maxY), minY)
  }
}

const zoomTarget = { x: 0, y: 0 }
const zoomPoint = { x: 0, y: 0 }

function onWheel(e: WheelEvent) {
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

const startMoveoffset = {
  x: 0,
  y: 0,
}

const startMoveOffset = {
  x: 0,
  y: 0,
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

function onKeyDown(e: KeyboardEvent) {
  if (!wrapperEl || !nuxtRootEl) {
    return
  }
  if (e.code === 'PageUp') {
    scrollToTop()
  } else if (e.code === 'PageDown') {
    const rect = nuxtRootEl.getBoundingClientRect()
    updateOffset(offset.x, -wrapperEl.offsetHeight + rect.height - 50)
  } else if (e.code === 'ArrowUp') {
    updateOffset(offset.x, offset.y + 50)
  } else if (e.code === 'ArrowDown') {
    updateOffset(offset.x, offset.y - 50)
  } else if (e.code === 'Digit0' && e.ctrlKey) {
    resetZoom()
  }
}

function scrollToTop() {
  updateOffset(offset.x, 50)
}

function getCenterX(): number {
  if (nuxtRootEl && wrapperEl) {
    const rootRect = nuxtRootEl.getBoundingClientRect()
    const wrapperRect = wrapperEl.getBoundingClientRect()
    return (rootRect.width - wrapperRect.width) / 2
  }
  return 0
}

let raf: any = null
function loop() {
  updateStyles()
  const canvasRect = wrapperEl?.getBoundingClientRect()
  const rootRect = nuxtRootEl?.getBoundingClientRect()
  const sidebarRect = sidebarEl?.getBoundingClientRect()
  const fieldAreas = [...document.querySelectorAll('[data-field-label]')]
    .map((el) => {
      if (el instanceof HTMLElement) {
        const rect = el.getBoundingClientRect()
        const label = el.dataset.fieldLabel
        const name = el.dataset.fieldName
        const key = el.dataset.fieldKey
        const isNested = el.dataset.fieldIsNested === 'true'
        if (label && name && key) {
          return {
            key,
            label,
            name,
            isNested,
            rect,
            isVisible: !!el.offsetHeight,
          }
        }
      }
    })
    .filter(falsy)
  if (canvasRect && rootRect && sidebarRect) {
    rootRect.width = rootRect.width - sidebarRect.width
    eventBus.emit('animationFrame', {
      mouseX: mouseX.value,
      mouseY: mouseY.value,
      scale: scale.value,
      rootRect,
      canvasRect,
      fieldAreas,
      rects: [
        ...document.querySelectorAll(
          '[data-element-type="existing"]:not(.sortable-drag)',
        ),
      ].reduce<Record<string, DOMRect>>((acc, el) => {
        if (el instanceof HTMLElement) {
          const uuid = el.dataset.uuid
          if (uuid) {
            const rect = el.getBoundingClientRect()
            acc[uuid] = rect
          }
        }
        return acc
      }, {}),
    })
  }

  raf = window.requestAnimationFrame(loop)
}

const mouseX = ref(0)
const mouseY = ref(0)

function onMouseMoveGlobal(e: MouseEvent) {
  mouseX.value = e.x
  mouseY.value = e.y
}

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

onMounted(() => {
  wrapperEl = document.querySelector('.pb-main-canvas')
  nuxtRootEl = document.querySelector('#nuxt-root')
  sidebarEl = document.querySelector('.pb-sidebar')
  window.addEventListener('mousedown', onMouseDown)
  window.addEventListener('mouseup', onMouseUp)
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('mousemove', onMouseMoveGlobal, {
    passive: false,
  })
  document.body.addEventListener('wheel', onWheel, { passive: false })
  setInitState()
  updateStyles()
  loop()
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
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('mousemove', onMouseMoveGlobal)
  nuxtRootEl?.classList.remove('pb-has-sidebar-open')
  nuxtRootEl?.classList.remove('pb-has-preview-open')
  window.cancelAnimationFrame(raf)
  if (wrapperEl) {
    wrapperEl.style.translate = ''
    wrapperEl.style.scale = ''
  }
})
</script>
