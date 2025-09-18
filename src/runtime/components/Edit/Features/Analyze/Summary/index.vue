<template>
  <div class="bk-analyze-summary">
    <div class="bk-analyze-summary-chart">
      <Chart :data="summary" :percentage />
      <ul>
        <li v-for="item in summary">
          <div :style="{ backgroundColor: item.color }" />
          <div>
            <span>{{ item.label }}</span>
            <span>{{ item.value }}</span>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { rgbaToString } from '#blokkli/helpers'
import { computed, useBlokkli } from '#imports'
import { useAnalyzeHelper } from '../helper'
import type { AnalyzeResultMapped, AnalyzeStatus } from '../types'
import Chart from './Chart.vue'

const props = defineProps<{
  results: AnalyzeResultMapped[]
}>()

const { theme } = useBlokkli()

const { getStatusLabel } = useAnalyzeHelper()

const SORT: Record<AnalyzeStatus, number> = {
  violation: 4,
  incomplete: 3,
  pass: 2,
  inapplicable: 1,
}

function getColor(status: AnalyzeStatus): string {
  if (status === 'pass') {
    return rgbaToString(theme.lime.value.normal)
  } else if (status === 'incomplete') {
    return rgbaToString(theme.yellow.value.normal)
  } else if (status === 'violation') {
    return rgbaToString(theme.red.value.normal)
  }

  return rgbaToString(theme.mono.value[200])
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
    .map(([key, value]) => {
      const status = key as unknown as AnalyzeStatus
      return {
        status,
        label: getStatusLabel(status),
        value,
        color: getColor(status),
      }
    })
    .filter((v) => v.status !== 'inapplicable')
    .sort((a, b) => {
      return SORT[b.status] - SORT[a.status]
    })
})

const percentage = computed(() => {
  const total = summary.value.reduce((acc, item) => {
    return acc + item.value
  }, 0)

  const pass = summary.value.find((v) => v.status === 'pass')?.value ?? 0

  return Math.round((pass / total) * 100)
})
</script>
