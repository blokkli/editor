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
import { computed, useBlokkli, useState } from '#imports'
import axe from './analyzers/axe'
import type {
  AnalyzeCategory,
  AnalyzeResultMapped,
  Analyzer,
  AnalyzerContext,
} from './types'
import Results from './Results/Results.vue'
import AnalyzeSummary from './Summary/index.vue'
import { useAnalyzeHelper } from './helper'
import { FormSelect, RelativeTime } from '#blokkli/components'
import { defaultLanguage, forceDefaultLanguage } from '#blokkli-build/config'
import type { FieldListItemTyped } from '#blokkli-build/generated-types'

const props = defineProps<{
  langcode: string
}>()

const ALL = 'ALL'

const { $t, ui, state, adapter } = useBlokkli()
const { getCategoryLabel } = useAnalyzeHelper()

function getAdapterAnalyzers(): Promise<Analyzer[]> {
  if (adapter.getAnalyzers) {
    const result = adapter.getAnalyzers()
    if (Array.isArray(result)) {
      return Promise.resolve(result)
    }
    return Promise.resolve(result).then((result) => {
      if (Array.isArray(result)) {
        return result
      }

      return [result]
    })
  }

  return Promise.resolve([])
}

const adapterAnalyzers = await getAdapterAnalyzers()
const analyzers = [axe, ...adapterAnalyzers]

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
  return {
    langcode: props.langcode,
    interfaceLangcode: forceDefaultLanguage ? defaultLanguage : props.langcode,
    providerRootElement,
    mutatedFields: state.mutatedFields.value,
    getFieldListItem: (uuid: string) => {
      return state.getFieldListItem(uuid) as FieldListItemTyped | undefined
    },
  }
}

async function onClick() {
  if (isLoading.value) {
    return
  }

  const context = getContext()

  isLoading.value = true

  if (!hasInitialized.value) {
    await Promise.all(
      analyzers.map(async (analyzer) => {
        if (analyzer.init) {
          await analyzer.init(context)
        }
      }),
    )
  }
  hasInitialized.value = true
  results.value = await Promise.all(
    analyzers.map(async (analyzer) => {
      const categoryFromAnalyzer =
        'category' in analyzer ? analyzer.category : undefined
      const result = await analyzer.run(context)
      return result.map((v) => {
        const categoryFromItem = 'category' in v ? v.category : undefined
        const category = categoryFromItem ?? categoryFromAnalyzer
        if (!category) {
          throw new Error(
            `Missing category in result item "${v.id}" in analyzer "${analyzer.id}"`,
          )
        }
        return {
          ...v,
          plugin: analyzer.id,
          category,
        }
      })
    }),
  ).then((v) => v.flat())

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
