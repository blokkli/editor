<template>
  <slot :formatted :formatted-date>
    <span :title="formattedDate">{{ formatted }}</span>
  </slot>
</template>

<script lang="ts" setup>
import { isValidDate } from '#blokkli/editor/helpers/date'
import { ref, computed, onMounted, onBeforeUnmount, useBlokkli } from '#imports'

const props = defineProps<{
  timestamp: number | string
}>()

const { ui } = useBlokkli()

const date = computed<Date | null>(() => {
  const dateArg =
    typeof props.timestamp === 'number'
      ? props.timestamp * 1000
      : props.timestamp
  const parsedDate = new Date(dateArg)
  return isValidDate(parsedDate) ? parsedDate : null
})

const formattedDate = computed<string>(() => {
  return date.value ? ui.formatDate(date.value) : ''
})

/**
 * Convert a date to a relative time string, such as
 * "a minute ago", "in 2 hours", "yesterday", "3 months ago", etc.
 * using Intl.RelativeTimeFormat
 */
function getRelativeTimeString(
  date: Date | number,
  lang = navigator.language,
): string {
  // Allow dates or times to be passed
  const timeMs = typeof date === 'number' ? date : date.getTime()

  // Get the amount of seconds between the given date and now
  const deltaSeconds = Math.round((timeMs - Date.now()) / 1000)

  // Array reprsenting one minute, hour, day, week, month, etc in seconds
  const cutoffs = [
    60,
    3600,
    86400,
    86400 * 7,
    86400 * 30,
    86400 * 365,
    Infinity,
  ]

  // Array equivalent to the above but in the string representation of the units
  const units: Intl.RelativeTimeFormatUnit[] = [
    'second',
    'minute',
    'hour',
    'day',
    'week',
    'month',
    'year',
  ]

  // Grab the ideal cutoff unit
  const unitIndex = cutoffs.findIndex(
    (cutoff) => cutoff > Math.abs(deltaSeconds),
  )

  // Get the divisor to divide from the seconds. E.g. if our unit is "day" our divisor
  // is one day in seconds, so we can divide our seconds by this to get the # of days
  const divisor = unitIndex ? cutoffs[unitIndex - 1]! : 1

  // Intl.RelativeTimeFormat do its magic
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' })
  return rtf.format(Math.floor(deltaSeconds / divisor), units[unitIndex]!)
}

const incrementToggle = ref(0)
let interval: any = null

const formatted = computed(() => {
  if (!date.value) {
    return
  }

  // Adding the toggle value forces an update, so the relative time stays correct.
  // We add 0 or 1 ms which doesn't affect the display but triggers reactivity.
  const dateIncremented = new Date(date.value.getTime() + incrementToggle.value)
  return getRelativeTimeString(dateIncremented, ui.interfaceLanguage.value)
})

onMounted(() => {
  interval = setInterval(() => {
    incrementToggle.value = incrementToggle.value ? 0 : 1
  }, 1000)
})

onBeforeUnmount(() => {
  clearInterval(interval)
})
</script>

<script lang="ts">
export default {
  name: 'RelativeTime',
}
</script>
