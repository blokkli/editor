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
import {
  ref,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
  useBlokkli,
} from '#imports'
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
    if (result.score === null || result.band === null) continue
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

<style lang="postcss">
.bk.bk-readability-chunk-overlay {
  @apply absolute top-0 left-0 pointer-events-none;
  transform-origin: 0 0;

  .bk-readability-chunk-rect {
    @apply absolute top-0 left-0 rounded;
    @apply border-2;

    &.bk-is-easy {
      @apply border-lime-normal bg-lime-light/30;
      .bk-readability-chunk-badge {
        @apply bg-lime-normal text-white;
      }
    }
    &.bk-is-ok {
      @apply border-yellow-normal bg-yellow-light/30;
      .bk-readability-chunk-badge {
        @apply bg-yellow-normal text-yellow-dark;
      }
    }
    &.bk-is-hard {
      @apply border-red-normal bg-red-light/30;
      .bk-readability-chunk-badge {
        @apply bg-red-normal text-white;
      }
    }
  }

  &.bk-is-stale .bk-readability-chunk-rect {
    @apply opacity-30;
  }

  .bk-readability-chunk-badge {
    @apply absolute right-0 bottom-full;
    @apply text-xs font-semibold px-5 py-2 rounded-t;
    @apply whitespace-nowrap;
  }
}
</style>
