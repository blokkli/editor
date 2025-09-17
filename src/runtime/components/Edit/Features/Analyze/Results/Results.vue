<template>
  <div>
    <details
      v-for="group in grouped"
      :open="group.open"
      class="bk-analyze-results"
    >
      <summary>
        <div>
          <span>{{ group.label }}</span>
          <div>
            <span class="bk-pill">{{ group.results.length }}</span>
          </div>
        </div>
        <Icon name="caret" />
      </summary>
      <ul>
        <li>
          <ResultsItem v-for="result in group.results" v-bind="result" />
        </li>
      </ul>
    </details>
  </div>
</template>

<script setup lang="ts">
import { computed } from '#imports'
import type { AnalyzeResultMapped, AnalyzeStatus } from '../types'
import ResultsItem from './ResultsItem.vue'
import { Icon } from '#blokkli/components'

const props = defineProps<{
  results: AnalyzeResultMapped[]
}>()

type ResultGroup = 'problems' | 'success' | 'inapplicable'

const groupOrder: Record<ResultGroup, number> = {
  problems: 1,
  success: 2,
  inapplicable: 3,
}

const statusOrder: Record<AnalyzeStatus, number> = {
  violation: 1,
  incomplete: 2,
  pass: 3,
  inapplicable: 4,
}

function getGroup(status: AnalyzeStatus): ResultGroup {
  if (status === 'violation' || status === 'incomplete') {
    return 'problems'
  } else if (status === 'pass') {
    return 'success'
  }

  return 'inapplicable'
}

function getGroupLabel(group: ResultGroup): string {
  if (group === 'problems') {
    return 'Problems'
  } else if (group === 'success') {
    return 'Success'
  }

  return 'Inapplicable'
}

const grouped = computed(() => {
  const map = props.results.reduce<Record<string, AnalyzeResultMapped[]>>(
    (acc, result) => {
      const group = getGroup(result.status)
      if (!acc[group]) {
        acc[group] = []
      }

      acc[group]!.push(result)
      return acc
    },
    {},
  )

  return Object.entries(map)
    .map(([key, results]) => {
      const group = key as unknown as ResultGroup
      return {
        group,
        label: getGroupLabel(group),
        open: group === 'problems',
        results: results.sort((a, b) => {
          const statusDiff = statusOrder[a.status] - statusOrder[b.status]

          if (statusDiff !== 0) {
            return statusDiff
          }

          return a.title.localeCompare(b.title)
        }),
      }
    })
    .sort((a, b) => {
      return groupOrder[a.group] - groupOrder[b.group]
    })
})
</script>
