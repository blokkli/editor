<template>
  <div class="bk-analyze-results-item">
    <div class="bk-analyze-results-item-tags">
      <Status :status />
      <div class="bk-pill bk-is-mono">{{ categoryLabel }}</div>
    </div>
    <h3>{{ title }}</h3>
    <p v-if="description">{{ description }}</p>

    <ResultsItemNodes :nodes v-if="nodes.length" />
  </div>
</template>

<script setup lang="ts">
import { computed } from '#imports'
import type { AnalyzeResultMapped } from '../types'
import Status from './Status.vue'
import ResultsItemNodes from './ResultsItemNodes.vue'
import { useAnalyzeHelper } from '../helper'

const props = defineProps<AnalyzeResultMapped>()

const { getCategoryLabel } = useAnalyzeHelper()

const categoryLabel = computed(() => {
  return getCategoryLabel(props.category)
})
</script>
