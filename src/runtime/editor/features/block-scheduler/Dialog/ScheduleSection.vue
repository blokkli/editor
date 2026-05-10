<template>
  <PanelSection :title="label" padded :help>
    <div class="bk-schedule-section">
      <FormToggle
        v-model="isEnabled"
        :disabled
        :label="$t('scheduleEnable', 'Enable schedule')"
      />

      <TransitionHeight opacity>
        <div v-if="isEnabled">
          <div class="pt-20">
            <div v-if="hasMixedDates && !overrideMode">
              <InfoBox :text="mixedDatesMessage" />
              <div class="mt-15">
                <button
                  type="button"
                  class="bk-button bk-scheme-mono bk-is-light"
                  @click="enableOverride"
                >
                  {{ $t('blockSchedulerOverride', 'Set date for all') }}
                </button>
              </div>
            </div>

            <div v-if="!hasMixedDates || overrideMode">
              <ScheduleDate v-model="selectedDate" />
            </div>
          </div>
        </div>
      </TransitionHeight>
    </div>
  </PanelSection>
</template>

<script setup lang="ts">
import { ref, computed, watch, useBlokkli } from '#imports'
import {
  FormToggle,
  ScheduleDate,
  InfoBox,
  TransitionHeight,
} from '#blokkli/editor/components'
import type { BlokkliIcon } from '#blokkli-build/icons'
import PanelSection from '#blokkli/editor/components/Panel/Section/index.vue'

export type ScheduleItemData = {
  uuid: string
  bundle: string
  date: string | null | undefined
}

const props = withDefaults(
  defineProps<{
    label: string
    help: string
    icon: BlokkliIcon
    items: ScheduleItemData[]
    supportedBundles: string[]
    disabled?: boolean
  }>(),
  {
    disabled: false,
  },
)

const { $t, ui } = useBlokkli()

const modelValue = defineModel<string | null | undefined>()

const isEnabled = ref(false)
const selectedDate = ref<string | undefined>(undefined)
const overrideMode = ref(false)

// Determine if items have mixed dates
const hasMixedDates = computed(() => {
  // Only consider items from bundles that support this action
  const supportedItems = props.items.filter((item) =>
    props.supportedBundles.includes(item.bundle),
  )

  if (supportedItems.length === 0) {
    return false
  }

  const dates = supportedItems.map((item) => item.date)

  // If no dates at all, not mixed
  if (dates.every((date) => date == null)) {
    return false
  }

  // Check if all dates are the same (including null checks)
  const firstDate = dates[0]
  const allSame = dates.every((date) => date === firstDate)

  return !allSame
})

// Get the common date if all items have the same date
const commonDate = computed(() => {
  if (hasMixedDates.value) {
    return undefined
  }

  // Only consider items from bundles that support this action
  const supportedItems = props.items.filter((item) =>
    props.supportedBundles.includes(item.bundle),
  )

  const dates = supportedItems
    .map((item) => item.date)
    .filter((date) => date != null)

  if (dates.length === 0) {
    return undefined
  }

  return dates[0] || undefined
})

// Format the mixed dates message
const mixedDatesMessage = computed(() => {
  // Only consider items from bundles that support this action
  const supportedItems = props.items.filter((item) =>
    props.supportedBundles.includes(item.bundle),
  )

  const dates = supportedItems
    .map((item) => item.date)
    .filter((date) => date != null)

  // Get unique dates
  const uniqueDates = [...new Set(dates)]

  // Format each date
  const formattedDates = uniqueDates
    .map((date) => ui.formatDate(date!))
    .join(', ')

  // Get the translation and replace @dates placeholder
  const message = $t(
    'blockSchedulerMixedDates',
    'Selected blocks have different dates: @dates',
  )

  return message.replace('@dates', formattedDates)
})

// Helper function to get tomorrow's date as ISO string
function getTomorrowDate(): string {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(12, 0, 0, 0)
  return tomorrow.toISOString()
}

// Helper function to get the most common date from the items
function getMostCommonDate(): string | undefined {
  // Only consider items from bundles that support this action
  const supportedItems = props.items.filter((item) =>
    props.supportedBundles.includes(item.bundle),
  )

  const dates = supportedItems
    .map((item) => item.date)
    .filter((date) => date != null) as string[]

  if (dates.length === 0) {
    return undefined
  }

  // Count occurrences of each date
  const dateCount = new Map<string, number>()
  for (const date of dates) {
    dateCount.set(date, (dateCount.get(date) || 0) + 1)
  }

  // Find the date with the highest count
  let mostCommonDate: string | undefined
  let maxCount = 0

  for (const [date, count] of dateCount.entries()) {
    if (count > maxCount) {
      maxCount = count
      mostCommonDate = date
    }
  }

  return mostCommonDate
}

// Initialize state based on items
// Enable toggle if any supported block has a date and the section is not disabled
const supportedItems = props.items.filter((item) =>
  props.supportedBundles.includes(item.bundle),
)
const hasAnyDate = supportedItems.some((item) => item.date != null)
if (hasAnyDate && !props.disabled) {
  isEnabled.value = true
  if (commonDate.value) {
    selectedDate.value = commonDate.value
  }
}

// Watch for changes to isEnabled
watch(isEnabled, (enabled) => {
  if (!enabled) {
    selectedDate.value = undefined
    overrideMode.value = false
    modelValue.value = null
  } else if (commonDate.value && !hasMixedDates.value) {
    // If enabling and there's a common date, use it
    selectedDate.value = commonDate.value
  } else if (!selectedDate.value) {
    // If enabling and no date is set, default to tomorrow
    selectedDate.value = getTomorrowDate()
  }
})

// Watch for changes to selectedDate
watch(selectedDate, (date) => {
  if (isEnabled.value) {
    modelValue.value = date || null
  }
})

// Enable override mode to allow setting a date for all blocks
function enableOverride() {
  overrideMode.value = true
  // Use the most common date if available, otherwise default to tomorrow
  selectedDate.value = getMostCommonDate() || getTomorrowDate()
}

// Expose state for parent
defineExpose({
  isEnabled,
  selectedDate,
})
</script>
