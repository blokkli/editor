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

const { ui, $t } = useBlokkli()

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
 * "less than a minute ago", "in 2 hours", "yesterday", "3 months ago", etc.
 * using Intl.RelativeTimeFormat. The smallest unit is a minute — seconds are
 * too noisy and update constantly.
 */
function getRelativeTimeString(
  date: Date | number,
  lang = navigator.language,
): string {
  // Allow dates or times to be passed
  const timeMs = typeof date === 'number' ? date : date.getTime()

  // Get the amount of seconds between the given date and now
  const deltaSeconds = Math.round((timeMs - Date.now()) / 1000)

  // Below a minute we don't count seconds: the exact value is noise and would
  // update every second. Show a stable, compact label instead.
  if (Math.abs(deltaSeconds) < 60) {
    return $t('relativeTimeJustNow', 'just now')
  }

  // Array representing one hour, day, week, month, etc in seconds
  const cutoffs = [3600, 86400, 86400 * 7, 86400 * 30, 86400 * 365, Infinity]

  // Array equivalent to the above but in the string representation of the units
  const units: Intl.RelativeTimeFormatUnit[] = [
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
  // is one day in seconds, so we can divide our seconds by this to get the # of days.
  // The minute unit (index 0) has no smaller cutoff, so fall back to 60.
  const divisor = unitIndex ? cutoffs[unitIndex - 1]! : 60

  // Intl.RelativeTimeFormat do its magic. `Math.trunc` (not `Math.floor`) so we
  // round toward zero: a past time of 61s is "1 minute ago", not "2 minutes ago"
  // (`Math.floor(-61 / 60)` would be -2).
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' })
  return rtf.format(Math.trunc(deltaSeconds / divisor), units[unitIndex]!)
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
