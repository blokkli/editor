<template>
  <Section
    group="ignored"
    :label="$t('analyzeIgnoredResults', 'Ignored')"
    :count="totalCount"
    :results="results"
  />
</template>

<script setup lang="ts">
import { computed, useBlokkli } from '#imports'
import type { AnalyzeResultMapped } from '../analyzers/types'
import Section from '../Results/Section.vue'

const props = defineProps<{
  results: AnalyzeResultMapped[]
}>()

const { $t } = useBlokkli()

const totalCount = computed(() =>
  props.results.reduce((sum, r) => sum + r.nodes.length, 0),
)
</script>
