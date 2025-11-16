<template>
  <div class="bk-analyze-results-item">
    <div class="bk-analyze-results-item-tags">
      <Status :status :title="key" />
      <div class="bk-pill bk-is-mono">{{ categoryLabel }}</div>
      <div class="bk-analyze-results-item-help">
        <a v-if="link" :href="link" target="_blank" :title="link">
          <span>{{ $t('analyzeMoreLink', 'More') }}</span>
          <Icon name="help" />
        </a>
      </div>
    </div>
    <h3>{{ title }}</h3>
    <p v-if="descriptionMapped || link">
      {{ descriptionMapped }}
    </p>

    <ResultsItemNodes v-model="activeId" :nodes :result-id="id" />
  </div>
</template>

<script setup lang="ts">
import { computed, useBlokkli } from '#imports'
import { Icon } from '#blokkli/components'
import type { AnalyzeResultMapped } from '../analyzers/types'
import Status from './Status.vue'
import ResultsItemNodes from './ResultsItemNodes.vue'
import { useAnalyzeHelper } from '../helper'

const props = defineProps<AnalyzeResultMapped>()

const activeId = defineModel<string>({ default: '' })

const { getCategoryLabel } = useAnalyzeHelper()

const { $t } = useBlokkli()

const categoryLabel = computed(() => {
  return getCategoryLabel(props.category)
})

const descriptionMapped = computed(() => {
  if (!props.description) {
    return ''
  }
  const punctuation = /[.!?]$/

  if (punctuation.test(props.description.trim())) {
    return props.description
  }

  return props.description + '.'
})

const key = computed(() => `${props.plugin}:${props.id}`)
</script>
