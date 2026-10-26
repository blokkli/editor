<template>
  <PanelSection :title="label" padded :help>
    <div
      class="bk-schedule-section"
      :data-test="testId"
      :data-test-disabled="disabled"
    >
      <FormToggle
        v-model="isEnabled"
        :disabled
        :data-test="testId + '-toggle'"
        :label="$t('scheduleEnable', 'Enable schedule')"
      />

      <TransitionHeight opacity>
        <div v-if="isEnabled">
          <div class="pt-20">
            <table
              v-if="languageRows.length"
              class="bk-table mb-15"
              :data-test="testId + '-languages'"
            >
              <tbody>
                <tr
                  v-for="row in languageRows"
                  :key="row.langcode"
                  :data-test="testId + '-language-' + row.langcode"
                  :data-test-dates="row.dates.join(',')"
                  :data-test-published="row.statuses.join(',')"
                >
                  <td class="w-full">
                    <strong>{{ row.label }}</strong>
                  </td>
                  <td class="whitespace-nowrap pl-18 text-sm">
                    {{ row.datesLabel }}
                  </td>
                  <td v-if="showStatus" class="whitespace-nowrap pl-18 text-sm">
                    <div class="flex items-center gap-10">
                      <StatusIndicator
                        v-if="row.statuses.length === 1"
                        :status="row.statuses[0] ? 'success' : 'error'"
                      />
                      {{ row.statusLabel }}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            <div v-if="hasMixedDates && !overrideMode">
              <InfoBox
                v-if="!languageRows.length"
                :text="mixedDatesMessage"
                class="mb-15"
                :data-test="testId + '-mixed'"
              />
              <button
                type="button"
                class="bk-button bk-scheme-mono bk-is-light"
                :data-test="testId + '-override'"
                @click="enableOverride"
              >
                {{
                  languageRows.length
                    ? $t(
                        'blockSchedulerOverrideLanguages',
                        'Set date for all languages',
                      )
                    : $t('blockSchedulerOverride', 'Set date for all')
                }}
              </button>
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
  StatusIndicator,
  TransitionHeight,
} from '#blokkli/editor/components'
import type { BlokkliIcon } from '#blokkli-build/icons'
import PanelSection from '#blokkli/editor/components/Panel/Section/index.vue'

/**
 * A date of a block in one of its languages.
 */
export type ScheduleItemData = {
  uuid: string
  bundle: string
  langcode: string
  date: string | null | undefined
  isPublished?: boolean
}

const props = withDefaults(
  defineProps<{
    label: string
    help: string
    icon: BlokkliIcon
    items: ScheduleItemData[]
    supportedBundles: string[]
    disabled?: boolean
    /** `data-test` id for the section root (e.g. `scheduler-publish`). */
    testId: string
    /**
     * The names of the page's languages, by langcode, when it has several.
     * While the languages differ, each one's dates are listed.
     */
    languageLabels?: Record<string, string> | null
    /**
     * Whether the list of languages shows their status, which the date sets.
     */
    showStatus?: boolean
  }>(),
  {
    disabled: false,
    languageLabels: null,
    showStatus: false,
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

/**
 * Each language's dates and status, while the languages differ: they're
 * overwritten when a date is set. Empty on a page in one language, and for
 * blocks that have one translation.
 */
const languageRows = computed(() => {
  if (!props.languageLabels) {
    return []
  }

  const supportedItems = props.items.filter((item) =>
    props.supportedBundles.includes(item.bundle),
  )

  const rows = Object.entries(props.languageLabels).flatMap(
    ([langcode, label]) => {
      const items = supportedItems.filter((item) => item.langcode === langcode)
      if (!items.length) {
        return []
      }
      // Several selected blocks can differ in one language.
      const dates = [...new Set(items.map((item) => item.date ?? null))]
      const statuses = [...new Set(items.map((item) => !!item.isPublished))]
      return [
        {
          langcode,
          label,
          dates: dates.map((date) => date ?? ''),
          statuses,
          datesLabel: dates
            .map((date) =>
              date ? ui.formatDate(date) : $t('notSet', 'Not set'),
            )
            .join(' / '),
          statusLabel: statuses
            .map((isPublished) =>
              isPublished
                ? $t('blockSchedulerPublished', 'Published')
                : $t('blockSchedulerUnpublished', 'Unpublished'),
            )
            .join(' / '),
        },
      ]
    },
  )

  const statusesDiffer =
    props.showStatus &&
    new Set(supportedItems.map((item) => !!item.isPublished)).size > 1

  return rows.length > 1 && (hasMixedDates.value || statusesDiffer) ? rows : []
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
