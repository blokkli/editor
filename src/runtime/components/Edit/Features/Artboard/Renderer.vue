<template>
  <Scrollbar :artboard="artboard" orientation="y" />
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
    weight="100"
    @click="resetZoom"
  >
    <div class="bk-feature-canvas-button">
      <span>{{ zoomLevel }}</span>
    </div>
  </PluginToolbarButton>

  <PluginViewOption
    id="artboardOverview"
    v-slot="{ isActive }"
    :label="$t('artboardOverviewToggle', 'Toggle overview')"
    :title-on="$t('artboardOverviewShow', 'Show overview')"
    :title-off="$t('artboardOverviewHide', 'Hide overview')"
    :tour-text="
      $t(
        'artboardOverviewTourText',
        `Displays a top level overview of your content.`,
      )
    "
    icon="eye"
    key-code="O"
    weight="90"
  >
    <Teleport
      v-if="isActive && dom.isReady.value"
      :to="ui.mainLayoutElement.value"
    >
      <Overview :artboard="artboard" />
    </Teleport>
  </PluginViewOption>
</template>

<script setup lang="ts">
import {
  watch,
  computed,
  useBlokkli,
  onMounted,
  onBeforeUnmount,
} from '#imports'
import type { Coord } from '#blokkli/types'
import {
  asValidNumber,
  calculateIntersection,
  isInsideRect,
  subtractRectFromViewport,
} from '#blokkli/helpers'
import { PluginToolbarButton, PluginViewOption } from '#blokkli/plugins'
import Overview from './Overview/index.vue'
import Scrollbar from './Scrollbar/index.vue'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import {
  createArtboard,
  type ArtboardOptions,
  type Artboard,
  type PluginWheelOptions,
  type PluginWheelFactory,
  touch,
  wheel,
  mouse,
  dom as domPlugin,
} from 'artboard-deluxe'
import { addElementClasses } from '#blokkli/helpers/composables/addElementClasses'

const props = defineProps<{
  persist: boolean
  momentum: boolean
  scrollSpeed: number
}>()

addElementClasses(document.documentElement, 'bk-is-artboard')

const { context, storage, ui, animation, $t, dom, selection } = useBlokkli()

const artboardElement = ui.artboardElement()

const zoomLevel = computed(() => Math.round(ui.artboardScale.value * 100) + '%')

const PADDING = 50

const options = computed<ArtboardOptions>(() => {
  return {
    maxScale: ui.isMobile.value ? 1 : 3,
    direction: ui.isMobile.value ? 'vertical' : 'both',
    minScale: 0.1,
    overscrollBounds: {
      top: ui.visibleViewport.value.y + PADDING,
      left: ui.visibleViewport.value.x + PADDING,
      right:
        ui.viewport.value.width -
        ui.visibleViewport.value.width -
        ui.visibleViewport.value.x +
        PADDING,
      bottom: PADDING,
    },
    getBlockingRects: () => {
      const toolbarRects = subtractRectFromViewport(
        ui.viewport.value,
        ui.visibleViewport.value,
      )

      return [...toolbarRects, ...ui.viewportBlockingRects.value]
    },
  }
})

watch(options, function (newOptions) {
  artboard.setOptions(newOptions)
})

type SavedState = {
  offset: Coord
  scale: number
}
const storageKey = computed(
  () =>
    'artboard:' +
    context.value.entityUuid +
    (ui.isMobile.value ? 'mobile' : 'desktop'),
)
const savedState = storage.use<SavedState | null>(storageKey, null)

const saveState = () => {
  if (!props.persist) {
    return
  }
  savedState.value = {
    offset: artboard.getOffset(),
    scale: artboard.getScale(),
  }
}

let pluginWheel: PluginWheelFactory | null = null

const wheelOptions = computed<PluginWheelOptions>(() => {
  return {
    useMomentumZoom: props.momentum,
    useMomentumScroll: props.momentum,
    interceptWheel: true,
    scrollSpeed: props.scrollSpeed,
    wheelZoomFactor: props.scrollSpeed,
  }
})

watch(wheelOptions, function (newOptions) {
  if (pluginWheel) {
    pluginWheel.options.setAll(newOptions)
  }
})

watch(selection.uuids, function () {
  if (artboard.getMomentum()) {
    artboard.cancelAnimation()
  }
})

function getArtboard(): Artboard {
  pluginWheel = wheel(wheelOptions.value)
  return createArtboard(
    ui.rootElement(),
    [
      mouse(),
      touch(),
      pluginWheel,
      domPlugin({
        element: artboardElement,
        precision: 1,
        restoreStyles: true,
      }),
    ],
    {
      initTransform:
        savedState.value && props.persist
          ? {
              x: asValidNumber(savedState.value.offset.x, 0),
              y: asValidNumber(savedState.value.offset.y, 0),
              scale: asValidNumber(savedState.value?.scale, 1),
            }
          : undefined,
      ...options.value,
    },
  )
}

const artboard = getArtboard()

watch(options, function (newOptions) {
  artboard.setOptions(newOptions)
})

const AUTOSCROLL_EDGE_ZONE = 130
const AUTOSCROLL_SPEED = 12
let autoScrollSpeed = 1
let lastScrollDirection = 0 // -1 = up, 1 = down, 0 = none

function edgeStep(distance: number): number {
  const ratio = distance / AUTOSCROLL_EDGE_ZONE
  return Math.pow(ratio, 3) * AUTOSCROLL_SPEED
}

let hasLeftAddList = false
let hasLeftEdgeZone = false

onBlokkliEvent('dragging:end', () => {
  hasLeftAddList = false
  hasLeftEdgeZone = false
  autoScrollSpeed = 1
  lastScrollDirection = 0
})

function handleAutoScroll(mouseX: number, mouseY: number) {
  // When dragging, automatically scroll the artboard when the mouse is in the
  // top or bottom edge of the viewport.
  if (selection.isDragging.value) {
    // Prevent autoscroll when the user is hovering over the horizontal add list.
    if (!hasLeftAddList) {
      if (isInsideRect(mouseX, mouseY, ui.visibleViewportPadded.value)) {
        hasLeftAddList = true
      } else {
        return
      }
    }

    const viewportHeight = ui.visibleViewport.value.height
    const currentOffset = artboard.getOffset()
    // Convert mouseY to be relative to the visible viewport
    const y = Math.min(
      Math.max(mouseY - ui.visibleViewport.value.y, 0),
      viewportHeight,
    )

    const isInEdgeZone =
      y < AUTOSCROLL_EDGE_ZONE || y > viewportHeight - AUTOSCROLL_EDGE_ZONE

    // Track if the user has left the edge zone
    if (!isInEdgeZone && !hasLeftEdgeZone) {
      hasLeftEdgeZone = true
    }

    let dy = 0
    let currentDirection = 0

    // Only auto-scroll if the user has left the edge zone at least once
    if (hasLeftEdgeZone && isInEdgeZone) {
      if (y < AUTOSCROLL_EDGE_ZONE) {
        const dist = AUTOSCROLL_EDGE_ZONE - y
        // scroll down.
        dy = edgeStep(dist)
        currentDirection = 1
      } else if (y > viewportHeight - AUTOSCROLL_EDGE_ZONE) {
        const dist = y - (viewportHeight - AUTOSCROLL_EDGE_ZONE)
        // scroll up.
        dy = -edgeStep(dist)
        currentDirection = -1
      }
    }

    // Reset speed when direction changes
    if (currentDirection !== 0 && currentDirection !== lastScrollDirection) {
      autoScrollSpeed = 1
      lastScrollDirection = currentDirection
    }

    if (dy !== 0) {
      artboard.setOffset(null, currentOffset.y + dy * autoScrollSpeed)
      autoScrollSpeed = Math.min(autoScrollSpeed * 1.01, 2.25)
    }
  }
}

onBlokkliEvent('animationFrame:before', ({ time, mouseY, mouseX }) => {
  handleAutoScroll(mouseX, mouseY)

  artboard.loop(time)
  const artboardSize = artboard.getArtboardSize()
  if (artboardSize) {
    ui.artboardSize.value.height = artboardSize.height
    ui.artboardSize.value.width = artboardSize.width
  }

  const offset = artboard.getOffset()

  // We don't need much precision here, so we can round it.
  // This also prevents updating rects in WebGL buffers for small changes.
  ui.artboardOffset.value.x = asValidNumber(Math.ceil(offset.x), 0)
  ui.artboardOffset.value.y = asValidNumber(Math.ceil(offset.y), 0)
  ui.artboardScale.value = asValidNumber(artboard.getScale(), 1)
  animation.requestDraw()
})

onMounted(() => {
  window.addEventListener('beforeunload', saveState)
})

onBeforeUnmount(() => {
  saveState()
  artboard.destroy()
  window.removeEventListener('beforeunload', saveState)
})

const resetZoom = () => {
  artboard.resetZoom({
    duration: 500,
  })
  animation.requestDraw()
}

onBlokkliEvent('keyPressed', (e) => {
  if (ui.hasDialogOpen.value) {
    return
  }

  if (e.code === 'Home') {
    e.originalEvent.preventDefault()
    artboard.scrollToTop()
    animation.requestDraw()
  } else if (e.code === 'End') {
    e.originalEvent.preventDefault()
    artboard.scrollToEnd()
    animation.requestDraw()
  } else if (e.code === 'PageUp') {
    e.originalEvent.preventDefault()
    artboard.scrollPageUp()
    animation.requestDraw()
  } else if (e.code === 'PageDown') {
    e.originalEvent.preventDefault()
    artboard.scrollPageDown()
    animation.requestDraw()
  } else if (e.code === 'ArrowUp') {
    e.originalEvent.preventDefault()
    artboard.scrollUp()
    animation.requestDraw()
  } else if (e.code === 'ArrowDown') {
    e.originalEvent.preventDefault()
    artboard.scrollDown()
    animation.requestDraw()
  } else if (e.code === '0' && e.meta) {
    e.originalEvent.preventDefault()
    resetZoom()
  } else if (e.code === '1' && e.meta) {
    e.originalEvent.preventDefault()
    artboard.scaleToFit()
    animation.requestDraw()
  }
})

onBlokkliEvent('scrollIntoView', (e) => {
  if ('uuid' in e) {
    dom.refreshBlockRect(e.uuid)
    const rect = dom.getBlockRect(e.uuid)
    if (!rect) {
      return
    }

    const viewportRelativeRect = ui.getViewportRelativeRect(rect)

    // Skip scrolling if at least half of the block is already visible.
    if (
      calculateIntersection(viewportRelativeRect, ui.visibleViewport.value) >=
      0.75
    ) {
      return
    }

    artboard.scrollIntoView(rect, {
      scale: 'none',
      axis: 'y',
      behavior: e.immediate ? 'instant' : 'auto',
    })
  } else {
    if (artboardElement.contains(e.element)) {
      artboard.scrollElementIntoView(e.element, {
        scale: 'none',
        axis: 'y',
        behavior: e.immediate ? 'instant' : 'auto',
      })
    } else {
      artboard.scrollToTop({
        duration: 0,
      })
    }
  }
})
</script>
