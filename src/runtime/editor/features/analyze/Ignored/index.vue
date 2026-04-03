<template>
  <details class="bk-analyze-results">
    <summary>
      <div>
        <span>{{ $t('analyzeIgnoredResults', 'Ignored') }}</span>
        <div>
          <span class="bk-pill">{{ totalCount }}</span>
        </div>
      </div>
      <Icon name="bk_mdi_arrow_drop_down" />
    </summary>
    <ul>
      <li>
        <ResultsItem
          v-for="result in results"
          v-bind="result"
          :key="result.id"
          v-model="activeId"
        />
      </li>
    </ul>
  </details>
</template>

<script setup lang="ts">
import { computed, ref, useBlokkli } from '#imports'
import type { AnalyzeResultMapped } from '../analyzers/types'
import ResultsItem from '../Results/ResultsItem.vue'
import { Icon } from '#blokkli/editor/components'

const props = defineProps<{
  results: AnalyzeResultMapped[]
}>()

const activeId = ref('')

const { $t } = useBlokkli()

const totalCount = computed(() =>
  props.results.reduce((sum, r) => sum + r.nodes.length, 0),
)
</script>
