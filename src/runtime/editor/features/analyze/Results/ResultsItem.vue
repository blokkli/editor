<template>
  <div class="py-20 border-b border-b-mono-300 first:pt-0 last:border-b-0">
    <div class="bk-analyze-results-item-tags">
      <Status :status :title="key" />
      <div class="bk-pill bk-is-mono">{{ categoryLabel }}</div>
      <div class="bk-analyze-results-item-help">
        <a v-if="link" :href="link" target="_blank" :title="link">
          <span>{{ $t('analyzeMoreLink', 'More') }}</span>
          <Icon name="bk_mdi_help-fill" />
        </a>
      </div>
    </div>
    <h3 class="font-semibold text-base">{{ title }}</h3>
    <div
      v-if="description"
      class="text-sm text-mono-600 mt-5 bk-analyze-results-item-description"
      v-html="description"
    />

    <ResultsItemNodes :nodes :result-id="id" />
  </div>
</template>

<script setup lang="ts">
import { computed, useBlokkli } from '#imports'
import { Icon } from '#blokkli/editor/components'
import type {
  AnalyzeCategory,
  AnalyzeImpact,
  AnalyzeNodeMapped,
  AnalyzeStatus,
} from '../analyzers/types'
import Status from './Status.vue'
import ResultsItemNodes from './ResultsItemNodes.vue'
import { useAnalyzeHelper } from '../helper'

const props = defineProps<{
  id: string
  title: string
  category: AnalyzeCategory
  description: string
  link?: string
  status: AnalyzeStatus
  impact?: AnalyzeImpact
  plugin: string
  nodes: AnalyzeNodeMapped[]
}>()

const { getCategoryLabel } = useAnalyzeHelper()

const { $t } = useBlokkli()

const categoryLabel = computed(() => {
  return getCategoryLabel(props.category)
})

const key = computed(() => `${props.plugin}:${props.id}`)
</script>
