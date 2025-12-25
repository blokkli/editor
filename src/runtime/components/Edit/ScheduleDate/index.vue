<template>
  <div class="bk-schedule-date">
    <div class="bk-schedule-date-picker">
      <FormDatepicker
        v-model="selectedDate"
        :min="minDate"
        :disabled="disabled"
        :error="!!error"
      />
    </div>
    <div v-if="selectedDate" class="bk-schedule-date-time">
      <div v-if="formattedDateTime" class="bk-schedule-date-formatted">
        {{ formattedDateTime }}
      </div>
      <div class="bk-schedule-date-time-input">
        <input
          id="schedule-time"
          v-model="selectedTime"
          type="time"
          class="bk-form-input"
          :disabled="disabled"
          :class="{
            'bk-is-invalid': error,
          }"
        />
        <button
          type="button"
          class="bk-button bk-schedule-date-time-button bk-is-icon-only"
          :disabled="disabled"
          @click="decrementHour"
        >
          <Icon name="bk_mdi_remove" />
        </button>
        <button
          type="button"
          class="bk-button bk-schedule-date-time-button bk-is-icon-only"
          :disabled="disabled"
          @click="incrementHour"
        >
          <Icon name="bk_mdi_add" />
        </button>
      </div>

      <slot />
      <div v-if="error" class="bk-schedule-date-error">
        {{ error }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, useBlokkli } from '#imports'
import { FormDatepicker, Icon } from '#blokkli/components'

const { ui } = useBlokkli()

defineProps<{
  disabled?: boolean
  error?: string
}>()

const modelValue = defineModel<string>()

const selectedDate = ref<string>('')
const selectedTime = ref<string>('12:00')

const formattedDateTime = computed(() => {
  if (!selectedDate.value || !selectedTime.value) {
    return ''
  }

  const dateTimeString = `${selectedDate.value}T${selectedTime.value}:00`
  const date = new Date(dateTimeString)

  return ui.formatDate(date, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
})

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

// Time adjustment functions
function incrementHour() {
  const [hours = 0, minutes = 0] = selectedTime.value.split(':').map(Number)
  // If minutes are not 00, round up to next hour, otherwise increment hour
  const newHours = minutes > 0 ? (hours + 1) % 24 : (hours + 1) % 24
  selectedTime.value = `${String(newHours).padStart(2, '0')}:00`
}

function decrementHour() {
  const [hours = 0, minutes = 0] = selectedTime.value.split(':').map(Number)
  // If minutes are not 00, round down to current hour, otherwise decrement hour
  const newHours = minutes > 0 ? hours : hours === 0 ? 23 : hours - 1
  selectedTime.value = `${String(newHours).padStart(2, '0')}:00`
}
</script>
