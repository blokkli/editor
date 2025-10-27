<template>
  <div class="bk bk-analyze">
    <div class="bk-analyze-button">
      <button
        class="bk-button bk-is-primary"
        :disabled="!isStale"
        @click="onClick"
      >
        {{ $t('analyzeButtonLabel', 'Analyze Page') }}
      </button>

      <p v-if="lastRun" class="bk-analyze-last-run">
        <RelativeTime v-slot="{ formatted }" :timestamp="lastRun">
          {{
            $t('analyzeLastRun', 'Last run: @time').replace('@time', formatted)
          }}
        </RelativeTime>
      </p>
      <p v-if="isStale && hasRunOnce" class="bk-message-info">
        {{
          $t(
            'analyzeStaleMessage',
            'The contents of the page have changed since last analyzing the page. Please run the analyzers again to get updated results.',
          )
        }}
      </p>
    </div>

    <div v-if="resultsFiltered.length" class="bk-analyze-wrapper">
      <div class="bk-analyze-form">
        <FormSelect
          id="category"
          v-model="selectedCategory"
          :label="$t('analyzeCategory', 'Category')"
          :options="categoryOptions"
        />
      </div>
      <AnalyzeSummary :results="resultsFiltered" />
      <Results :results="resultsFiltered" />
    </div>
  </div>
  <Overlay
    v-if="
      resultsFiltered.length && gl && animation.webglEnabled.value && !isStale
    "
    :results="resultsFiltered"
    :gl="gl"
  />
</template>

<script setup lang="ts">
import { computed, useBlokkli, useState, ref } from '#imports'
import type {
  AnalyzeCategory,
  AnalyzeResultMapped,
  Analyzer,
} from './analyzers/types'
import Results from './Results/Results.vue'
import AnalyzeSummary from './Summary/index.vue'
import Overlay from './Overlay/index.vue'
import { useAnalyzeHelper } from './helper'
import { FormSelect, RelativeTime } from '#blokkli/components'
import { AnalyzerContext } from './analyzers/helpers/Context'
import { normalizeToArray } from './analyzers/helpers/normalizeArray'
import { falsy } from '#blokkli/helpers'
import { renderCycle } from '#blokkli/helpers/renderCycle'

const props = defineProps<{
  langcode: string
  analyzers: Analyzer[]
}>()

const ALL = 'ALL'

const { $t, ui, state, animation } = useBlokkli()
const { getCategoryLabel } = useAnalyzeHelper()

const gl = animation.gl()

const currentPlugin = ref('readability')

const hasRunOnce = useState(() => false)
const results = useState<AnalyzeResultMapped[]>('blokkli:analyze', () => [])
const isLoading = useState(() => false)
const lastRun = useState(() => 0)
const lastRunKey = useState(() => '')
const selectedCategory = useState(() => ALL)
const hasInitialized = useState(() => false)
const providerRootElement = ui.providerElement

const resultsFiltered = computed(() => {
  if (selectedCategory.value === ALL) {
    return results.value
  }

  return results.value.filter((v) => v.category === selectedCategory.value)
})

const isStale = computed(() => lastRunKey.value !== state.refreshKey.value)

function getContext(): AnalyzerContext {
  return new AnalyzerContext(
    props.langcode,
    ui.interfaceLanguage.value,
    providerRootElement,
    state,
    $t,
  )
}

async function onClick() {
  if (isLoading.value) {
    return
  }

  const requiresRawPage = props.analyzers.some(
    (analyzer) => analyzer.requireRawPage,
  )

  if (requiresRawPage) {
    ui.isAnalyzing.value = true
  }
  isLoading.value = true
  await renderCycle()

  const context = getContext()

  if (!hasInitialized.value) {
    await Promise.all(
      props.analyzers.map(async (analyzer) => {
        if (analyzer.init) {
          await analyzer.init(context)
        }
      }),
    )
  }
  hasInitialized.value = true

  const newResults: AnalyzeResultMapped[] = []

  for (let i = 0; i < props.analyzers.length; i++) {
    const analyzer = props.analyzers[i]!
    currentPlugin.value = analyzer.id
    const result = await normalizeToArray(analyzer.run(context))
    const mapped = result.filter(falsy).map((v) => {
      return {
        ...v,
        plugin: analyzer.id,
      } satisfies AnalyzeResultMapped
    })

    newResults.push(...mapped)
  }

  results.value = newResults

  isLoading.value = false
  hasRunOnce.value = true
  lastRun.value = Date.now() / 1000
  lastRunKey.value = state.refreshKey.value
  if (requiresRawPage) {
    ui.isAnalyzing.value = false
  }
}

const categoryOptions = computed<{ value: string; label: string }[]>(() => {
  const set = results.value.reduce<Set<AnalyzeCategory>>((acc, v) => {
    acc.add(v.category)
    return acc
  }, new Set())

  const categories = [...set.values()].map((value) => {
    return {
      value,
      label: getCategoryLabel(value),
    }
  })
  return [
    {
      value: ALL,
      label: $t('all', 'All'),
    },
    ...categories,
  ]
})
</script>
