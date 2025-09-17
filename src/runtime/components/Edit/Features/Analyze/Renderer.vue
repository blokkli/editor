<template>
  <div class="bk bk-analyze">
    <div class="bk-analyze-button">
      <button @click="onClick" class="bk-button bk-is-primary">
        {{ $t('analyzeButtonLabel', 'Analyze Page') }}
      </button>
    </div>

    <div v-if="results.length" class="bk-analyze-wrapper">
      <div class="bk-analyze-form">
        <FormSelect
          id="category"
          label="Category"
          :options="categoryOptions"
          v-model="selectedCategory"
        />
      </div>
      <AnalyzeSummary :results />
      <Results :results />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, useBlokkli, useState } from '#imports'
import axe from './analyzers/axe'
import type {
  AnalyzeCategory,
  AnalyzeResultMapped,
  AnalyzerContext,
} from './types'
import Results from './Results/Results.vue'
import AnalyzeSummary from './Summary/index.vue'
import { useAnalyzeHelper } from './helper'
import { FormSelect } from '#blokkli/components'

const props = defineProps<{
  langcode: string
}>()

const { $t } = useBlokkli()
const { getCategoryLabel } = useAnalyzeHelper()

const analyzers = [axe]

const results = useState<AnalyzeResultMapped[]>('blokkli:analyze', () => [])
const selectedCategory = ref('ALL')

const context = computed<AnalyzerContext>(() => {
  return {
    langcode: props.langcode,
  }
})

async function onClick() {
  results.value = await Promise.all(
    analyzers.map(async (analyzer) => {
      const result = await analyzer.run(context.value)
      return result.map((v) => {
        return {
          ...v,
          plugin: analyzer.id,
          category: analyzer.category,
        }
      })
    }),
  ).then((v) => v.flat())
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
      value: 'ALL',
      label: 'All',
    },
    ...categories,
  ]
})
</script>
