<template>
  <dl class="flex flex-col gap-4">
    <div v-if="address && !compact">
      <dt class="text-sm font-semibold text-stone-600">
        {{ $texts('office.address', 'Address') }}
      </dt>
      <dd class="whitespace-pre-line">{{ address }}</dd>
    </div>
    <div v-if="phone">
      <dt class="text-sm font-semibold text-stone-600">
        {{ $texts('office.phone', 'Phone') }}
      </dt>
      <dd>
        <a :href="'tel:' + phone.replace(/[^+\d]/g, '')" class="underline">
          {{ phone }}
        </a>
      </dd>
    </div>
    <div v-if="email">
      <dt class="text-sm font-semibold text-stone-600">
        {{ $texts('office.email', 'Email') }}
      </dt>
      <dd>
        <a :href="'mailto:' + email" class="underline">{{ email }}</a>
      </dd>
    </div>
    <div v-if="days.length && !compact">
      <dt class="text-sm font-semibold text-stone-600">
        {{ $texts('office.opening_hours', 'Opening hours') }}
      </dt>
      <dd>
        <table class="w-full">
          <tbody>
            <tr v-for="day in days" :key="day.name">
              <th class="py-0.5 pr-4 text-left font-normal">{{ day.name }}</th>
              <td class="py-0.5">{{ day.hours }}</td>
            </tr>
          </tbody>
        </table>
      </dd>
    </div>
  </dl>
</template>

<script lang="ts" setup>
import { computed, useEasyTexts } from '#imports'
import type { OfficeDetailsFragment } from '#graphql-operations'
import { useLanguage } from '~/composables/useLanguage'

const props = defineProps<
  OfficeDetailsFragment & {
    /** Only the phone and the email. */
    compact?: boolean
  }
>()

const language = useLanguage()
const { $texts } = useEasyTexts()

// office_hours numbers the days from 0 (Sunday). The week starts on Monday.
const WEEK = [1, 2, 3, 4, 5, 6, 0]

// Times are stored as numbers, e.g. 830 for 08:30.
function formatTime(value: number): string {
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${pad(Math.floor(value / 100))}:${pad(value % 100)}`
}

const days = computed(() => {
  const slots = (props.hours ?? []).filter(
    (slot) => slot?.starthours != null && slot.endhours != null,
  )
  if (!slots.length) {
    return []
  }
  const weekday = new Intl.DateTimeFormat(language.value, {
    weekday: 'long',
    timeZone: 'UTC',
  })
  return WEEK.map((day) => {
    const hours = slots
      .filter((slot) => slot?.day === day)
      .sort((a, b) => (a?.starthours ?? 0) - (b?.starthours ?? 0))
      .map(
        (slot) =>
          `${formatTime(slot?.starthours ?? 0)}–${formatTime(slot?.endhours ?? 0)}`,
      )
    return {
      // 4 January 1970 was a Sunday.
      name: weekday.format(new Date(Date.UTC(1970, 0, 4 + day))),
      hours: hours.join(', ') || $texts('office.closed', 'Closed'),
    }
  })
})
</script>
