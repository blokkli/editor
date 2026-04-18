<template>
  <ViewportBlockingRect
    id="artboard-overview"
    ref="overviewEl"
    class="bk bk-artboard-overview"
    @touchstart.stop
    @pointerdown.stop
    @mousedown.stop
    @mousemove.stop
  >
    <div
      ref="overviewArtboardEl"
      class="bg-white absolute top-0 left-0 outline-mono-400 outline-1 outline pointer-events-none overflow-hidden"
    >
      <canvas ref="canvas" class="absolute top-0 left-0 size-full" />
    </div>
    <div
      class="absolute top-0 left-0 size-full bg-mono-900/60 mix-blend-multiply"
    >
      <button
        ref="overviewVisibleEl"
        class="relative top-0 left-0 bg-white cursor-move will-change-transform rounded"
      />
    </div>
  </ViewportBlockingRect>
</template>

<script setup lang="ts">
import {
  type Artboard,
  type PluginOverview,
  type PluginOverviewOptions,
  overview,
} from 'artboard-deluxe'
import {
  onBeforeUnmount,
  onMounted,
  useBlokkli,
  computed,
  useTemplateRef,
  watch,
} from '#imports'
import { ViewportBlockingRect } from '#blokkli/editor/components'
import { onBlokkliEvent } from '#blokkli/editor/composables'

const props = defineProps<{
  artboard: Artboard
}>()

const { theme, dom, ui, selection } = useBlokkli()

const overviewFillColor = computed(() => {
  return theme.getColorString('mono', '500', 0.2)
})

const selectedColor = computed(() => {
  return theme.getColorString('accent', '700', 1)
})

const overviewEl = useTemplateRef('overviewEl')
const overviewArtboardEl = useTemplateRef('overviewArtboardEl')
const overviewVisibleEl = useTemplateRef('overviewVisibleEl')
const canvas = useTemplateRef('canvas')

let pluginOverview: PluginOverview | null = null

function updateCanvas() {
  const ctx = canvas.value?.getContext('2d')

  if (!ctx || !canvas.value || !overviewArtboardEl.value) {
    return
  }

  const rect = overviewArtboardEl.value.getBoundingClientRect()

  canvas.value.width = rect.width
  canvas.value.height = rect.height

  ctx.clearRect(0, 0, rect.width, rect.height)

  const rects = Object.entries(dom.getBlockRects())

  const scale = rect.width / ui.artboardSize.value.width

  const LINE_WIDTH = 2.5

  ctx.fillStyle = overviewFillColor.value
  ctx.lineWidth = LINE_WIDTH
  ctx.strokeStyle = selectedColor.value

  for (let i = 0; i < rects.length; i++) {
    const [uuid, blockRect] = rects[i]!
    if (!blockRect) {
      continue
    }
    ctx.fillRect(
      Math.round(blockRect.x * scale),
      Math.round(blockRect.y * scale),
      Math.round(blockRect.width * scale),
      Math.round(blockRect.height * scale),
    )
    if (selection.isBlockSelected(uuid)) {
      ctx.strokeRect(
        Math.round(blockRect.x * scale) + LINE_WIDTH / 2,
        Math.round(blockRect.y * scale) + LINE_WIDTH / 2,
        Math.round(blockRect.width * scale) - LINE_WIDTH,
        Math.round(blockRect.height * scale) - LINE_WIDTH,
      )
    }
  }
}

onBlokkliEvent('animationFrame', updateCanvas)

const overviewOptions = computed<Partial<PluginOverviewOptions>>(() => {
  return {
    padding: 15,
    autoHeight: true,
    maxHeight: ui.visibleViewportPadded.value.height,
  }
})

onMounted(() => {
  if (overviewEl.value && overviewArtboardEl.value && overviewVisibleEl.value) {
    const el = overviewEl.value.$el
    if (el) {
      pluginOverview = props.artboard.addPlugin(
        overview({
          element: el,
          artboardElement: overviewArtboardEl.value,
          visibleAreaElement: overviewVisibleEl.value,
          ...overviewOptions.value,
        }),
      )
    }
  }
})

watch(overviewOptions, (newOptions) => {
  if (!pluginOverview) {
    return
  }

  pluginOverview.options.setMultiple(newOptions)
})

onBeforeUnmount(() => {
  if (pluginOverview) {
    props.artboard.removePlugin(pluginOverview)
  }
})

defineOptions({
  name: 'ArtboardOverview',
})
</script>

<style lang="postcss">
.bk.bk-artboard-overview {
  @apply w-[180px] h-[500px] z-artboard-overview bg-mono-100 absolute top-0 right-0 rounded;
  @apply overflow-hidden contain-strict border border-mono-400 pointer-events-auto;
  margin-top: var(--bk-viewport-padding);
  margin-right: var(--bk-viewport-padding);
  grid-area: viewport;
  align-self: self-start;
  justify-self: self-end;
}
</style>
