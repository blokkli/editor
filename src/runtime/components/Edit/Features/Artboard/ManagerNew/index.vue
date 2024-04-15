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

  <Scrollbar
    :padding="props.padding"
    :offset="ui.artboardOffset.value.y"
    :root-size="ui.viewport.value.height"
    :artboard-size="ui.artboardSize.value.height"
    :scale="ui.artboardScale.value"
    orientation="height"
    @page-down="onPageDown"
    @page-up="onPageUp"
    @set-offset="setOffset('y', $event)"
  />

  <Scrollbar
    :padding="props.padding"
    :offset="ui.artboardOffset.value.x"
    :root-size="ui.viewport.value.width"
    :artboard-size="ui.artboardSize.value.width"
    :scale="ui.artboardScale.value"
    orientation="width"
    @page-down="onPageDown"
    @page-up="onPageUp"
    @set-offset="setOffset('x', $event)"
  />

  <Teleport v-if="showDebug" to="body">
    <div class="bk-artboard-debug">
      <div v-for="v in debugValues" :key="v.key">
        <div>{{ v.key }}</div>
        <div>{{ v.value }}</div>
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import {
  ref,
  watch,
  computed,
  useBlokkli,
  onMounted,
  onBeforeUnmount,
  onUnmounted,
} from '#imports'
import type { Coord } from '#blokkli/types'
import { PluginToolbarButton } from '#blokkli/plugins'
import Scrollbar from './Scrollbar/index.vue'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import defineShortcut from '#blokkli/helpers/composables/defineShortcut'
import { Artboard, type ArtboardOptions } from './Artboard'

const { context, storage, ui, animation, $t, dom } = useBlokkli()

const zoomLevel = computed(() => Math.round(ui.artboardScale.value * 100) + '%')

const showDebug = ref(false)

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

const options = computed<ArtboardOptions>(() => {
  return {
    maxScale: ui.isMobile.value ? 1 : 3,
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
  savedState.value = { offset: artboard.offset, scale: artboard.scale }
}

function getArtboard(): Artboard {
  const v = new Artboard(ui.artboardElement(), ui.rootElement(), {
    x: savedState.value?.offset.x,
    y: savedState.value?.offset.y,
    scale: savedState.value?.scale,
    ...options.value,
  })
  return v
}

const artboard = getArtboard()

function setOffset(key: 'x' | 'y', value: number) {
  artboard.stopAnimate()
  artboard.offset[key] = value
}

type DebugValue = {
  key: string
  value: string | number | boolean
}

const debugValues = ref<DebugValue[]>([])

const coordToString = (v: Coord): string =>
  `x: ${Math.round(v.x)}, y: ${Math.round(v.y)}`

onBlokkliEvent('animationFrame:before', () => {
  artboard.loop()
  ui.artboardSize.value.height = artboard.artboardSize.height
  ui.artboardSize.value.width = artboard.artboardSize.width
  ui.artboardOffset.value.x = artboard.offset.x
  ui.artboardOffset.value.y = artboard.offset.y
  ui.artboardScale.value = artboard.scale
  animation.requestDraw()
  debugValues.value = [
    {
      key: 'scale',
      value: artboard.scale.toString(),
    },
    {
      key: 'isScaling',
      value: artboard.isScaling,
    },
    {
      key: 'isDragging',
      value: artboard.isDragging,
    },
    {
      key: 'isTouching',
      value: artboard.isTouching,
    },
    {
      key: 'maxScale',
      value: artboard.maxScale,
    },
    {
      key: 'isMomentumScrolling',
      value: artboard.isMomentumScrolling,
    },
    {
      key: 'scaleMidpoint',
      value: artboard.scaleMidpoint
        ? coordToString(artboard.scaleMidpoint)
        : 'undefined',
    },
  ]
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
  artboard.resetZoom()
}

onUnmounted(() => {})

function onPageUp() {
  artboard.scrollPageUp()
  animation.requestDraw()
}

function onPageDown() {
  artboard.scrollPageDown()
  animation.requestDraw()
}

onBlokkliEvent('keyPressed', (e) => {
  if (e.code === 'Home') {
    artboard.scrollToTop()
    animation.requestDraw()
  } else if (e.code === 'End') {
    artboard.scrollToEnd()
    animation.requestDraw()
  } else if (e.code === 'PageUp') {
    onPageUp()
  } else if (e.code === 'PageDown') {
    onPageDown()
  } else if (e.code === 'ArrowUp') {
    artboard.animateOrJumpBy(200)
    animation.requestDraw()
  } else if (e.code === 'ArrowDown') {
    artboard.animateOrJumpBy(-200)
    animation.requestDraw()
  } else if (e.code === '0' && e.meta) {
    artboard.resetZoom()
    animation.requestDraw()
  } else if (e.code === '1' && e.meta) {
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
  artboard.stopAnimate()
  const visible = dom.getBlockVisibilities()[e.uuid]
  if (visible) {
    return
  }

  const element = findElementToScrollTo(e.uuid)
  if (!element) {
    return
  }

  const rect = element.getBoundingClientRect()
  const rectHeight = element.offsetHeight * artboard.scale

  let targetY: number | null = null
  const currentY = artboard.animationTarget?.y || artboard.offset.y
  const rootHeight = ui.visibleViewportPadded.value.height

  if (e.center) {
    targetY =
      currentY - rect.y + props.padding + rootHeight / 2 - rectHeight / 2
  } else if (rect.y < 70) {
    targetY = currentY - (rect.y - props.padding) + 70
  } else if (rect.y + rectHeight > rootHeight) {
    targetY = currentY + (rootHeight - (rect.y + rectHeight) - 40)
  }

  if (targetY) {
    artboard.setOffset(artboard.offset.x, targetY)
  }
})
</script>

<script lang="ts">
export default {
  name: 'ArtboardManager',
}
</script>
