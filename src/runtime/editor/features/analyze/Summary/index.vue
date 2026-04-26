<template>
  <div class="px-20 pb-20 pt-0">
    <div class="flex items-center gap-20">
      <Chart :data="summary" :percentage />
      <ul class="flex-1 flex flex-col gap-[7px]">
        <li
          v-for="item in summary"
          :key="item.status"
          class="flex items-center gap-[0.5em] leading-none"
        >
          <div
            :style="{ backgroundColor: item.color }"
            class="size-[0.75em] shrink-0 rounded-full"
          />
          <div class="font-semibold flex justify-between flex-1">
            <span>{{ item.label }}</span>
            <span>{{ item.value }}</span>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { rgbaToString } from '#blokkli/editor/helpers/color'
import { computed, useBlokkli } from '#imports'
import { useAnalyzeHelper } from '../helper'
import type { AnalyzeResultMapped, AnalyzeStatus } from '../analyzers/types'
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
      const nodes = Array.isArray(result.nodes) ? result.nodes : [result.nodes]
      const total = nodes.reduce((acc, node) => {
        const targets = Array.isArray(node.targets)
          ? node.targets
          : [node.targets]
        return acc + targets.length
      }, 0)
      acc[result.status]! += total
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
