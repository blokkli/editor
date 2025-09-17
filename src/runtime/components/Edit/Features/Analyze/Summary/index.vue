<template>
  <div class="bk-analyze-summary">
    <ul>
      <li
        v-for="item in summary"
        :class="'bk-is-' + item.status"
        :style="{
          flex: `${item.count} 0`,
        }"
      >
        <div>{{ item.status }}</div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed } from '#imports'
import type { AnalyzeResultMapped, AnalyzeStatus } from '../types'

const props = defineProps<{
  results: AnalyzeResultMapped[]
}>()

const SORT: Record<AnalyzeStatus, number> = {
  violation: 4,
  incomplete: 3,
  pass: 2,
  inapplicable: 1,
}

const summary = computed(() => {
  const byStatus = props.results.reduce<Record<string, number>>(
    (acc, result) => {
      acc[result.status] ||= 0
      acc[result.status]!++
      return acc
    },
    {},
  )

  return Object.entries(byStatus)
    .map(([key, count]) => {
      const status = key as unknown as AnalyzeStatus
      return {
        status,
        count,
      }
    })
    .filter((v) => v.status !== 'inapplicable')
    .sort((a, b) => {
      return SORT[b.status] - SORT[a.status]
    })
})
</script>
