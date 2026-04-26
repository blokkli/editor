<template>
  <div
    class="py-20 border-b border-b-mono-300 first:pt-0 last:border-b-0 group/results-item"
  >
    <div class="flex flex-wrap gap-5 mb-10">
      <Status :status :title="key" />
      <Pill :text="categoryLabel" scheme="mono" />
      <div class="ml-auto">
        <a
          v-if="link"
          :href="link"
          target="_blank"
          :title="link"
          class="flex text-sm gap-3 font-semibold leading-none items-center underline-offset-4 text-mono-400 hover:text-accent-600 hover:underline"
        >
          <span class="opacity-0 group-hover/results-item:opacity-100">{{
            $t('analyzeMoreLink', 'More')
          }}</span>
          <Icon name="bk_mdi_help-fill" class="size-18" />
        </a>
      </div>
    </div>
    <h3 class="font-semibold text-base">{{ title }}</h3>
    <div
      v-if="description"
      class="text-sm text-mono-600 mt-5 bk-content"
      v-html="description"
    />

    <ResultsItemNodes :nodes :result-id="id" />
  </div>
</template>

<script setup lang="ts">
import { computed, useBlokkli } from '#imports'
import { Icon, Pill } from '#blokkli/editor/components'
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
