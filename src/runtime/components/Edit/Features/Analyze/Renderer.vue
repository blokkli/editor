<template>
  <div class="bk bk-analyze">
    <div class="bk-analyze-button">
      <button
        @click="onClick"
        class="bk-button bk-is-primary"
        :class="{
          'bk-is-loading': isLoading,
        }"
        :disabled="!isStale"
      >
        {{ $t('analyzeButtonLabel', 'Analyze Page') }}
      </button>

      <div v-if="isLoading" class="bk-analyze-progress">
        <label for="file">{{ currentPlugin }}</label>

        <div class="bk-analyze-progress-bar">
          <progress id="file" max="100" :value="progress">
            {{ progress }}%
          </progress>
        </div>
      </div>

      <p v-if="lastRun" class="bk-analyze-last-run">
        <RelativeTime :timestamp="lastRun" v-slot="{ formatted }">
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

    <div
      v-if="resultsFiltered.length"
      class="bk-analyze-wrapper"
      :class="{
        'bk-is-loading': isLoading,
      }"
    >
      <div class="bk-analyze-form">
        <FormSelect
          id="category"
          :label="$t('analyzeCategory', 'Category')"
          :options="categoryOptions"
          v-model="selectedCategory"
        />
      </div>
      <AnalyzeSummary :results="resultsFiltered" />
      <Results :results="resultsFiltered" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, useBlokkli, useState, ref } from '#imports'
import type { AnalyzeCategory, AnalyzeResultMapped, Analyzer } from './types'
import Results from './Results/Results.vue'
import AnalyzeSummary from './Summary/index.vue'
import { useAnalyzeHelper } from './helper'
import { FormSelect, RelativeTime } from '#blokkli/components'
import { AnalyzerContext } from './analyzers/helpers/Context'
import { normalizeToArray } from './analyzers/helpers/normalizeArray'
import { falsy } from '#blokkli/helpers'

const props = defineProps<{
  langcode: string
  analyzers: Analyzer[]
}>()

const ALL = 'ALL'

const { $t, ui, state } = useBlokkli()
const { getCategoryLabel } = useAnalyzeHelper()

const progress = ref(0)

const currentPlugin = ref('readability')

const hasRunOnce = useState(() => false)
const results = useState<AnalyzeResultMapped[]>('blokkli:analyze', () => [])
const isLoading = useState(() => false)
const lastRun = useState(() => 0)
const lastRunKey = useState(() => '')
const selectedCategory = useState(() => ALL)
const hasInitialized = useState(() => false)
const providerRootElement = ui.providerElement()

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
  )
}

async function onClick() {
  if (isLoading.value) {
    return
  }

  const context = getContext()

  isLoading.value = true
  progress.value = 0

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
    progress.value = Math.round(((i + 1) / props.analyzers.length) * 100)
  }

  results.value = newResults

  isLoading.value = false
  hasRunOnce.value = true
  lastRun.value = Date.now() / 1000
  lastRunKey.value = state.refreshKey.value
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
