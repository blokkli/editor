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

  <Teleport to="body" v-if="showDebug">
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
import type { Coord, Size } from '#blokkli/types'
import { PluginToolbarButton } from '#blokkli/plugins'
import { lerp, calculateCenterPosition } from '#blokkli/helpers'
import { easeOutQuad } from '#blokkli/helpers/easing'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import defineShortcut from '#blokkli/helpers/composables/defineShortcut'
import { Artboard, type ArtboardOptions } from './Artboard'

const { keyboard, dom, context, storage, ui, animation, $t, selection } =
  useBlokkli()

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

onBlokkliEvent('keyPressed', (e) => {
  if (e.code === 'Home') {
    artboard.scrollToTop()
    animation.requestDraw()
  } else if (e.code === 'End') {
    artboard.scrollToEnd()
    animation.requestDraw()
  } else if (e.code === 'PageUp') {
    artboard.scrollPageUp()
    animation.requestDraw()
  } else if (e.code === 'PageDown') {
    artboard.scrollPageDown()
    animation.requestDraw()
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
</script>

<script lang="ts">
export default {
  name: 'ArtboardManager',
}
</script>
