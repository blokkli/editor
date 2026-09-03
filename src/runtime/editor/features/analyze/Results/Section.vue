<template>
  <details
    :open
    class="bk-analyze-results border-b border-b-mono-300 first:border-t first:border-t-mono-300 group"
    data-test="analyze-section"
    :data-test-section="group"
  >
    <summary
      v-show="!open"
      class="font-bold flex w-full cursor-pointer justify-between items-center hover:bg-mono-100 py-18 px-20 group-open:bg-transparent!"
      data-test="analyze-section-summary"
    >
      <div class="flex gap-3">
        <span>{{ label }}</span>
        <div>
          <Pill :text="count" />
        </div>
      </div>
      <Icon
        name="bk_mdi_arrow_drop_down"
        class="size-20 group-open:rotate-180"
      />
    </summary>
    <ul :class="{ 'pt-20': open }" class="px-20">
      <li>
        <ResultsItem
          v-for="result in results"
          v-bind="result"
          :key="result.id"
        />
      </li>
    </ul>
  </details>
</template>

<script setup lang="ts">
import type { AnalyzeResultMapped } from '../analyzers/types'
import ResultsItem from './ResultsItem.vue'
import { Icon, Pill } from '#blokkli/editor/components'

defineProps<{
  group: string
  label: string
  count: number
  results: AnalyzeResultMapped[]
  open?: boolean
}>()
</script>
