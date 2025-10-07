<template>
  <div class="bk-schedule-date">
    <div class="bk-schedule-date-picker">
      <FormDatepicker
        v-model="selectedDate"
        :min="minDate"
        :disabled="disabled"
      />
    </div>
    <div v-if="selectedDate" class="bk-schedule-date-time">
      <div class="bk-schedule-date-presets">
        <button
          type="button"
          class="bk-button bk-is-small"
          :disabled="disabled"
          @click="setTomorrow"
        >
          {{ $t('publishScheduleTomorrow', 'Tomorrow') }}
        </button>
        <button
          type="button"
          class="bk-button bk-is-small"
          :disabled="disabled"
          @click="setInSevenDays"
        >
          {{ $t('publishScheduleInSevenDays', 'In 7 days') }}
        </button>
        <button
          type="button"
          class="bk-button bk-is-small"
          :disabled="disabled"
          @click="setNextMonday"
        >
          {{ $t('publishScheduleNextMonday', 'Next Monday') }}
        </button>
      </div>
      <label class="bk-form-label" for="schedule-time">
        {{ $t('publishScheduleTime', 'Time') }}
      </label>
      <input
        id="schedule-time"
        v-model="selectedTime"
        type="time"
        class="bk-form-input"
        :disabled="disabled"
      />
      <div
        class="bk-schedule-date-info"
        v-text="
          $t(
            'publishScheduledInfo',
            'You can still make changes until the scheduled publication date.',
          )
        "
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, useBlokkli } from '#imports'
import { FormDatepicker } from '#blokkli/components'

const { $t } = useBlokkli()

defineProps<{
  disabled?: boolean
}>()

const modelValue = defineModel<string>()

const selectedDate = ref<string>('')
const selectedTime = ref<string>('12:00')

// Initialize from modelValue if provided
if (modelValue.value) {
  const date = new Date(modelValue.value)
  selectedDate.value = formatDate(date)
  selectedTime.value = formatTime(date)
}

// Min date is today
const minDate = computed(() => {
  const today = new Date()
  return formatDate(today)
})

function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

// Watch for changes and update modelValue
watch([selectedDate, selectedTime], () => {
  if (!selectedDate.value) {
    modelValue.value = undefined
    return
  }

  const dateTimeString = `${selectedDate.value}T${selectedTime.value}:00`
  const date = new Date(dateTimeString)
  modelValue.value = date.toISOString()
})

// Watch for external changes to modelValue
watch(modelValue, (newValue) => {
  if (!newValue) {
    selectedDate.value = ''
    selectedTime.value = '12:00'
    return
  }

  const date = new Date(newValue)
  const newDate = formatDate(date)
  const newTime = formatTime(date)

  if (newDate !== selectedDate.value || newTime !== selectedTime.value) {
    selectedDate.value = newDate
    selectedTime.value = newTime
  }
})

// Preset date functions
function setTomorrow() {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  selectedDate.value = formatDate(tomorrow)
}

function setInSevenDays() {
  const date = new Date()
  date.setDate(date.getDate() + 7)
  selectedDate.value = formatDate(date)
}

function setNextMonday() {
  const today = new Date()
  const dayOfWeek = today.getDay()
  // If today is Sunday (0), next Monday is 1 day away
  // If today is Monday (1), next Monday is 7 days away
  // If today is Tuesday (2), next Monday is 6 days away, etc.
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek
  const nextMonday = new Date()
  nextMonday.setDate(today.getDate() + daysUntilMonday)
  selectedDate.value = formatDate(nextMonday)
}
</script>
