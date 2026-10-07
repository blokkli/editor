<template>
  <table v-if="days.length">
    <tbody>
      <tr v-for="day in days" :key="day.name">
        <th class="py-0.5 pr-6 text-left font-normal">{{ day.name }}</th>
        <td class="py-0.5">{{ day.hours }}</td>
      </tr>
    </tbody>
  </table>
</template>

<script lang="ts" setup>
import type { OfficeDetailsFragment } from '#graphql-operations'

// An office's opening hours, one row per day of the week.
const props = defineProps<{
  hours: OfficeDetailsFragment['hours']
}>()

const language = useLanguage()
const { $texts } = useEasyTexts()

// office_hours numbers the days from 0 (Sunday). The week starts on Monday.
const WEEK = [1, 2, 3, 4, 5, 6, 0]

const days = computed(() => {
  if (!WEEK.some((day) => hoursOfDay(props.hours, day).length)) {
    return []
  }
  return WEEK.map((day) => ({
    name: weekdayName(day, language.value),
    hours:
      hoursOfDay(props.hours, day).join(', ') ||
      $texts('office.closed', 'Closed'),
  }))
})
</script>
