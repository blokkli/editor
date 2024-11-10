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
    <Teleport v-if="isActive" to="body">
      <Overview :artboard="artboard" />
    </Teleport>
  </PluginViewOption>

  <Scrollbar :artboard="artboard" orientation="y" />
</template>

<script lang="ts" setup>
import {
  watch,
  computed,
  useBlokkli,
  onMounted,
  onBeforeUnmount,
} from '#imports'
import type { Coord } from '#blokkli/types'
import { PluginToolbarButton, PluginViewOption } from '#blokkli/plugins'
import Overview from './Overview/index.vue'
import Scrollbar from './Scrollbar/index.vue'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import defineShortcut from '#blokkli/helpers/composables/defineShortcut'
import {
  createArtboard,
  type ArtboardOptions,
  type Artboard,
  touch,
  wheel,
  mouse,
  dom as domPlugin,
} from 'dragboard'

const { context, storage, ui, animation, $t, dom } = useBlokkli()

const zoomLevel = computed(() => Math.round(ui.artboardScale.value * 100) + '%')

const props = withDefaults(
  defineProps<{
    persist?: boolean
    momentum?: boolean
    scrollSpeed?: number
  }>(),
  {
    scrollSpeed: 1,
    persist: false,
    momentum: false,
  },
)

const PADDING = 50

const options = computed<ArtboardOptions>(() => {
  return {
    maxScale: ui.isMobile.value ? 1 : 3,
    minScale: 0.1,
    scrollSpeed: props.scrollSpeed,
    touchDirectionThresholdRatio: 0,
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
  }
})

watch(options, function (newOptions) {
  artboard.setOptions(newOptions)
})

type SavedState = {
  offset: Coord
  scale: number
}
const storageKey = computed(() => 'artboard:' + context.value.entityUuid)
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

function getArtboard(): Artboard {
  if (savedState.value) {
    return createArtboard(
      ui.rootElement(),
      [
        mouse(),
        touch(),
        wheel({
          useMomentumZoom: true,
          useMomentumScroll: true,
          interceptWheel: true,
        }),
        domPlugin({
          element: ui.artboardElement(),
        }),
      ],
      {
        initTransform: {
          x: savedState.value.offset.x,
          y: savedState.value.offset.y,
          scale: savedState.value?.scale || 1,
        },
        ...options.value,
      },
    )
  }
  return createArtboard(ui.rootElement(), [], options.value)
}

const artboard = getArtboard()

onBlokkliEvent('animationFrame:before', (time) => {
  artboard.loop(time)
  const artboardSize = artboard.getArtboardSize()
  if (artboardSize) {
    ui.artboardSize.value.height = artboardSize.height
    ui.artboardSize.value.width = artboardSize.width
  }

  const offset = artboard.getOffset()

  // We don't need much precision here, so we can round it.
  // This also prevents updating rects in WebGL buffers for small changes.
  ui.artboardOffset.value.x = Math.round(offset.x)
  ui.artboardOffset.value.y = Math.round(offset.y)
  ui.artboardScale.value = artboard.getScale()
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

onBlokkliEvent('scrollIntoView', (e) => {
  const rect = dom.getBlockRect(e.uuid)
  if (!rect) {
    return
  }

  if (dom.isBlockVisible(e.uuid)) {
    return
  }

  // @TODO: Prevent scrolling into view when already

  artboard.scrollIntoView(rect, {
    scale: 'none',
    axis: 'y',
    behavior: e.immediate ? 'instant' : 'auto',
  })
})
</script>

<script lang="ts">
export default {
  name: 'ArtboardManager',
}
</script>
