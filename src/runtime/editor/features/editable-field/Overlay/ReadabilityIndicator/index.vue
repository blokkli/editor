<template>
  <div
    v-if="readabilityScore != null && readabilityBand"
    class="bk-editable-field-readability"
    :class="{ 'bk-is-stale': stale }"
  >
    <span
      class="bk-editable-field-readability-dot"
      :class="'bk-is-' + readabilityBand"
    />
    <span
      >{{ readability.analyzer.value.scoreLabel }}
      {{ readability.formatScore(readabilityScore) }}</span
    >
    <div class="bk-tooltip">
      <p>
        {{
          $t(
            'readabilityTooltipDescription',
            '@label measures how easy the text is to read.',
          ).replace('@label', readability.analyzer.value.scoreLabel)
        }}
      </p>
      <p v-if="fieldType === 'markup'">
        {{
          $t(
            'readabilityEntireText',
            'This score is calculated for the entire text.',
          )
        }}
      </p>
      <div
        v-if="scaleInfo"
        class="bk-readability-scale"
        :class="'bk-is-' + scaleInfo.direction"
      >
        <div class="bk-readability-scale-labels">
          <span :style="{ left: thresholdPositions.first + '%' }">{{
            scaleInfo.thresholds[0]
          }}</span>
          <span :style="{ left: thresholdPositions.second + '%' }">{{
            scaleInfo.thresholds[1]
          }}</span>
        </div>
        <div class="bk-readability-scale-bar">
          <div class="bk-readability-scale-segments">
            <div
              class="bk-readability-scale-segment bk-is-left"
              :style="{ width: thresholdPositions.first + '%' }"
            />
            <div
              class="bk-readability-scale-segment bk-is-middle"
              :style="{
                left: thresholdPositions.first + '%',
                width:
                  thresholdPositions.second - thresholdPositions.first + '%',
              }"
            />
            <div
              class="bk-readability-scale-segment bk-is-right"
              :style="{
                left: thresholdPositions.second + '%',
                width: 100 - thresholdPositions.second + '%',
              }"
            />
          </div>
          <div
            class="bk-readability-scale-marker"
            :style="{ left: markerPosition + '%' }"
          >
            <span>{{ readability.formatScore(readabilityScore!) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div v-else-if="tooShort" class="bk-editable-field-readability">
    <span class="bk-editable-field-readability-dot" />
    <span>{{ $t('readabilityTooShort', 'Too short') }}</span>
    <div class="bk-tooltip">
      {{ minWordsText }}
    </div>
  </div>
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
import type { ReadabilityBand } from '../../../analyze/readability/types'

const { readability, context, $t } = useBlokkli()

const props = defineProps<{
  text: string
  fieldType: 'plain' | 'markup'
}>()

const readabilityBand = ref<ReadabilityBand | null>(null)
const readabilityScore = ref<number | null>(null)
const tooShort = ref(false)
const stale = ref(false)
let timeout: number | null = null

const scaleInfo = computed(() => {
  const analyzer = readability.analyzer.value
  if (analyzer.getScaleInfo) {
    return analyzer.getScaleInfo(context.value.language)
  }
  return null
})

const thresholdPositions = computed(() => {
  const info = scaleInfo.value
  if (!info) return { first: 33, second: 66 }
  const range = info.scaleMax - info.scaleMin
  return {
    first: ((info.thresholds[0] - info.scaleMin) / range) * 100,
    second: ((info.thresholds[1] - info.scaleMin) / range) * 100,
  }
})

const markerPosition = computed(() => {
  const info = scaleInfo.value
  const score = readabilityScore.value
  if (!info || score == null) return 50
  const range = info.scaleMax - info.scaleMin
  const clamped = Math.max(info.scaleMin, Math.min(info.scaleMax, score))
  return ((clamped - info.scaleMin) / range) * 100
})

const minWordsText = computed(() =>
  $t(
    'readabilityTooShortTooltip',
    'Text needs at least @count words for readability analysis.',
  ).replace(
    '@count',
    String(readability.analyzer.value.minWordsForConfidence || 100),
  ),
)

async function analyze(text: string) {
  if (!text.trim()) {
    readabilityBand.value = null
    readabilityScore.value = null
    tooShort.value = false
    stale.value = false
    return
  }
  // Analyze the entire text as a single chunk to get one overall score.
  // For markup fields, strip HTML tags first.
  let plainText = text
  if (props.fieldType === 'markup') {
    const doc = new DOMParser().parseFromString(text, 'text/html')
    plainText = doc.body.textContent || ''
  }
  const chunks = await readability.analyzeText(
    plainText,
    context.value.language,
    'plain',
  )
  if (chunks.length === 0) {
    readabilityBand.value = null
    readabilityScore.value = null
    tooShort.value = true
    stale.value = false
    return
  }
  tooShort.value = false
  readabilityBand.value = chunks[0]!.band
  readabilityScore.value = chunks[0]!.score
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

onMounted(() => {
  analyze(props.text)
})

onBeforeUnmount(() => {
  if (timeout) {
    window.clearTimeout(timeout)
  }
})
</script>
