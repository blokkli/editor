<template>
  <div
    ref="overviewEl"
    class="bk bk-artboard-overview"
    @touchstart.stop
    @pointerdown.stop
    @mousedown.stop
    @mousemove.stop
  >
    <div ref="overviewArtboardEl" class="bk-artboard-overview-artboard">
      <canvas ref="canvas" />
    </div>
    <div class="bk-artboard-overview-visible">
      <button ref="overviewVisibleEl" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { type Artboard, type ArtboardPlugin, overview } from 'artboard-deluxe'
import { onBeforeUnmount, onMounted, ref, useBlokkli, computed } from '#imports'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'

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

const overviewEl = ref<HTMLDivElement>()
const overviewArtboardEl = ref<HTMLDivElement>()
const overviewVisibleEl = ref<HTMLDivElement>()
const canvas = ref<HTMLCanvasElement>()

let pluginOverview: ArtboardPlugin | null = null

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

  ctx.fillStyle = overviewFillColor.value
  ctx.lineWidth = 1
  ctx.strokeStyle = selectedColor.value

  for (let i = 0; i < rects.length; i++) {
    const [uuid, blockRect] = rects[i]
    ctx.fillRect(
      Math.round(blockRect.x * scale),
      Math.round(blockRect.y * scale),
      Math.round(blockRect.width * scale),
      Math.round(blockRect.height * scale),
    )
    if (selection.isBlockSelected(uuid)) {
      ctx.strokeRect(
        Math.round(blockRect.x * scale) + 0.5,
        Math.round(blockRect.y * scale) + 0.5,
        Math.round(blockRect.width * scale),
        Math.round(blockRect.height * scale),
      )
    }
  }
}

onBlokkliEvent('animationFrame', updateCanvas)

onMounted(() => {
  if (overviewEl.value && overviewArtboardEl.value && overviewVisibleEl.value) {
    pluginOverview = props.artboard.addPlugin(
      overview({
        element: overviewEl.value,
        artboardElement: overviewArtboardEl.value,
        visibleAreaElement: overviewVisibleEl.value,
        padding: 20,
        autoHeight: true,
      }),
    )
  }
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
