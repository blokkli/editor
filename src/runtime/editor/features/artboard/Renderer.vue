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
    icon="bk_mdi_zoom_in"
    meta
    key-code="0"
    region="artboard"
    weight="100"
    class="!px-0"
    @click="onClickToolbarButton"
  >
    <PluginContextMenu
      id="artboard_zoom"
      :menu="zoomMenu"
      class="flex h-full items-center justify-center min-w-70 px-10 tabular-nums cursor-context-menu"
    >
      <span>{{ zoomLevel }}</span>
    </PluginContextMenu>
  </PluginToolbarButton>

  <Teleport
    v-if="isOverviewVisible && dom.isReady.value"
    :to="ui.mainLayoutElement.value"
  >
    <Overview :artboard="artboard" />
  </Teleport>
</template>

<script setup lang="ts">
import {
  watch,
  computed,
  useBlokkli,
  onMounted,
  onBeforeUnmount,
  defineAsyncComponent,
} from '#imports'
import {
  calculateIntersection,
  isInsideRect,
  subtractRectFromViewport,
} from '#blokkli/editor/helpers/geometry'
import { PluginToolbarButton, PluginContextMenu } from '#blokkli/editor/plugins'
import type { ContextMenu } from '#blokkli/editor/types/ui'
import Scrollbar from './Scrollbar/index.vue'
import {
  addElementClasses,
  defineViewOption,
  onBlokkliEvent,
} from '#blokkli/editor/composables'
import { asValidNumber } from '#blokkli/editor/helpers/math'
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
import type { Coord } from '#blokkli/editor/types/geometry'

const Overview = defineAsyncComponent(() => import('./Overview/index.vue'))

const props = defineProps<{
  persist: boolean
  momentum: boolean
  scrollSpeed: number
}>()

addElementClasses(document.documentElement, 'bk-is-artboard')

const { context, storage, ui, animation, $t, dom, selection } = useBlokkli()

const { isVisible: isOverviewVisible } = defineViewOption({
  id: 'artboardOverview',
  label: $t('viewOptionArtboardOverview', 'Overview'),
  description: $t(
    'viewOptionArtboardOverviewDescription',
    'Displays a top-level overview of all content blocks.',
  ),
  tourText: $t(
    'artboardOverviewTourText',
    'Displays a top level overview of your content.',
  ),
  icon: 'bk_mdi_crop_9_16',
  keyCode: 'O',
  weight: 90,
})

const artboardElement = ui.artboardElement()

const zoomLevel = computed(() => Math.round(ui.artboardScale.value * 100) + '%')

const ZOOM_LEVELS = [10, 25, 50, 75, 100, 125, 150, 200, 300]

const zoomMenu = computed<ContextMenu[]>(() => [
  ...ZOOM_LEVELS.map<ContextMenu>((level) => ({
    type: 'button',
    label: level + '%',
    icon: 'bk_mdi_zoom_in',
    callback: () => {
      const targetScale = level / 100
      artboard.scaleAroundPoint(
        ui.viewport.value.width / 2,
        ui.viewport.value.height / 2,
        targetScale,
        true,
      )
      animation.requestDraw()
    },
  })),
  { type: 'rule' },
  {
    type: 'button',
    label: $t('artboardScaleToFit', 'Scale to fit'),
    icon: 'bk_mdi_fit_screen',
    callback: () => {
      artboard.scaleToFit()
      animation.requestDraw()
    },
  },
])

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

const AUTOSCROLL_EDGE_ZONE = 80
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

function onClickToolbarButton() {
  ui.openContextMenu.value = ''
  resetZoom()
}

const resetZoom = () => {
  artboard.resetZoom({
    duration: 500,
  })
  animation.requestDraw()
}

onBlokkliEvent('keyPressed', (e) => {
  if (ui.hasDialogOpen.value || ui.hasNestedEditorOpen.value) {
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
  } else if (e.code === 'ArrowUp' && !ui.isApproving.value) {
    e.originalEvent.preventDefault()
    artboard.scrollUp()
    animation.requestDraw()
  } else if (e.code === 'ArrowDown' && !ui.isApproving.value) {
    e.originalEvent.preventDefault()
    artboard.scrollDown()
    animation.requestDraw()
  } else if (e.code === '0' && e.meta) {
    e.originalEvent.preventDefault()
    resetZoom()
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
      area: 'blocking',
    })
  } else if ('rect' in e) {
    // Always center the given artboard-space rect on both axes within the full
    // viewport, regardless of how much of it is already visible.
    artboard.scrollIntoView(e.rect, {
      scale: 'none',
      axis: 'both',
      block: 'center',
      inline: 'center',
      area: 'viewport',
      behavior: e.immediate ? 'instant' : 'auto',
    })
  } else {
    if (artboardElement.contains(e.element)) {
      const elRect = e.element.getBoundingClientRect()

      // Skip scrolling if at least half of the element is already visible.
      if (calculateIntersection(elRect, ui.visibleViewport.value) >= 0.75) {
        return
      }

      artboard.scrollElementIntoView(e.element, {
        scale: 'none',
        axis: 'both',
        behavior: e.immediate ? 'instant' : 'auto',
        area: 'blocking',
        block: 'auto',
        inline: 'auto',
      })
    } else {
      artboard.scrollToTop({
        duration: 0,
      })
    }
  }
})

onBlokkliEvent('setArtboardOffset', (e) => {
  artboard.setOffset(e.x ?? null, e.y ?? null, e.immediate ?? false)
  animation.requestDraw()
})

onBlokkliEvent('scrollSelectionIntoView', (e) => {
  const uuids = selection.uuids.value
  if (uuids.length === 0) {
    return
  }

  // Calculate the bounding rect that covers all selected blocks.
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const uuid of uuids) {
    dom.refreshBlockRect(uuid)
    const rect = dom.getBlockRect(uuid)
    if (!rect) {
      continue
    }
    minX = Math.min(minX, rect.x)
    minY = Math.min(minY, rect.y)
    maxX = Math.max(maxX, rect.x + rect.width)
    maxY = Math.max(maxY, rect.y + rect.height)
  }

  // No valid rects found.
  if (minX === Infinity) {
    return
  }

  const boundingRect = {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }

  const viewportRelativeRect = ui.getViewportRelativeRect(boundingRect)

  // Skip scrolling if most of the selection is already visible.
  if (
    calculateIntersection(viewportRelativeRect, ui.visibleViewport.value) >=
    0.75
  ) {
    return
  }

  artboard.scrollIntoView(boundingRect, {
    scale: 'none',
    axis: 'both',
    behavior: e.immediate ? 'instant' : 'auto',
  })
})
</script>

<style lang="postcss">
.bk-html-root.bk-is-artboard {
  .bk-body {
    .bk-main-canvas {
      @apply fixed top-0 left-1/2 xl:w-[80vw] w-screen lg:w-full lg:min-w-[1280px] max-w-[1920px] pointer-events-none z-10;
      background: white;
      user-select: none;
      image-rendering: crisp-edges;
      backface-visibility: hidden;
      transform-origin: 0 0;
      /* Set initial position to be centered. The artboard feature will update it on mount. */
      transform: translateX(-50%) translateY(100px);
      contain: layout paint inline-size style;
    }
  }
}
</style>
