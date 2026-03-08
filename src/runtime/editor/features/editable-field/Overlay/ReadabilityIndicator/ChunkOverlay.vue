<template>
  <Teleport to="#bk-canvas-overlay">
    <div
      class="bk bk-readability-chunk-overlay"
      :class="{ 'bk-is-stale': stale }"
      :style="containerStyle"
    >
      <div
        v-for="chunk in visibleChunks"
        :key="chunk.index"
        class="bk-readability-chunk-rect"
        :class="'bk-is-' + chunk.band"
        :style="chunk.style"
      >
        <span class="bk-readability-chunk-badge">
          {{ scoreLabel }} {{ formatScore(chunk.score) }}
        </span>
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, useBlokkli } from '#imports'
import { onBlokkliEvent } from '#blokkli/editor/composables'
import { collectTextElements } from '../../../analyze/analyzers/helpers/collectTextElements'
import type { ReadabilityBand } from '../../../analyze/readability/types'

const props = defineProps<{
  text: string
  fieldType: 'plain' | 'markup'
  element: HTMLElement
}>()

const { readability, context, ui } = useBlokkli()

type ChunkData = {
  index: number
  score: number
  band: ReadabilityBand
  element: HTMLElement
  style: {
    width: string
    height: string
    transform: string
  }
}

const chunks = ref<ChunkData[]>([])
const stale = ref(false)
let timeout: number | null = null
let lastFullUpdate = 0

const scoreLabel = computed(() => readability.analyzer.value.scoreLabel)

function formatScore(value: number): string {
  return readability.formatScore(value)
}

const containerStyle = computed(() => {
  const offset = ui.artboardOffset.value
  return {
    width: ui.artboardSize.value.width + 'px',
    height: ui.artboardSize.value.height + 'px',
    transform: `translate(${offset.x}px, ${offset.y}px) scale(${ui.artboardScale.value})`,
  }
})

const visibleChunks = computed(() =>
  chunks.value.filter((c) => c.style.width !== '0px'),
)

function updatePositions() {
  for (const chunk of chunks.value) {
    const r = ui.getAbsoluteElementRect(chunk.element)
    chunk.style = {
      width: r.width + 'px',
      height: r.height + 'px',
      transform: `translate(${r.x}px, ${r.y}px)`,
    }
  }
}

async function analyze(text: string) {
  if (!text.trim() || props.fieldType !== 'markup') {
    chunks.value = []
    stale.value = false
    return
  }

  const chunkResults = await readability.analyzeText(
    text,
    context.value.language,
    props.fieldType,
  )

  if (chunkResults.length === 0) {
    chunks.value = []
    stale.value = false
    return
  }

  // Wait for DOM to update with new text content.
  await new Promise((resolve) => requestAnimationFrame(resolve))

  const textElements = collectTextElements(props.element)

  const newChunks: ChunkData[] = []
  const count = Math.min(chunkResults.length, textElements.length)

  for (let i = 0; i < count; i++) {
    const result = chunkResults[i]!
    const textEl = textElements[i]!
    const r = ui.getAbsoluteElementRect(textEl.element)

    newChunks.push({
      index: i,
      score: result.score,
      band: result.band,
      element: textEl.element,
      style: {
        width: r.width + 'px',
        height: r.height + 'px',
        transform: `translate(${r.x}px, ${r.y}px)`,
      },
    })
  }

  chunks.value = newChunks
  stale.value = false
}

watch(
  () => props.text,
  (newText) => {
    if (timeout) {
      window.clearTimeout(timeout)
    }
    stale.value = true
    timeout = window.setTimeout(() => {
      analyze(newText)
    }, 500)
  },
)

onBlokkliEvent('animationFrame', (ctx) => {
  const forceRefresh = ctx.time - lastFullUpdate > 1000
  if (!forceRefresh) return
  lastFullUpdate = ctx.time
  updatePositions()
})

onMounted(() => {
  analyze(props.text)
})

onBeforeUnmount(() => {
  if (timeout) {
    window.clearTimeout(timeout)
  }
})
</script>
