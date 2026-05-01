<template>
  <div class="flex-1 flex gap-20">
    <div class="w-[300px] shrink-0">
      <FormDatepicker
        v-model="selectedDate"
        :min="minDate"
        :disabled="disabled"
        :error="!!error"
      />
    </div>
    <div v-if="selectedDate" class="flex-1">
      <div
        v-if="formattedDateTime"
        class="mb-20 px-10 font-bold text-lg bg-mono-100 h-[52px] flex items-center"
      >
        {{ formattedDateTime }}
      </div>
      <div class="flex gap-10 items-stretch">
        <input
          id="schedule-time"
          v-model="selectedTime"
          type="time"
          class="bk-form-input flex-1 w-full tabular-nums"
          :disabled="disabled"
          :class="{
            'bk-is-invalid': error,
          }"
        />
        <button
          type="button"
          class="bk-button bk-scheme-mono bk-is-icon-only shrink-0 px-10 [&_.bk-icon]:size-15 [&_.bk-icon_svg]:size-full [&_.bk-icon_svg]:fill-current"
          :disabled="disabled"
          @click="decrementHour"
        >
          <Icon name="bk_mdi_remove" />
        </button>
        <button
          type="button"
          class="bk-button bk-scheme-mono bk-is-icon-only shrink-0 px-10 [&_.bk-icon]:size-15 [&_.bk-icon_svg]:size-full [&_.bk-icon_svg]:fill-current"
          :disabled="disabled"
          @click="incrementHour"
        >
          <Icon name="bk_mdi_add" />
        </button>
      </div>

      <InfoBox v-if="error" :text="error" class="mt-20" color="red" small />
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, useBlokkli } from '#imports'
import { FormDatepicker, Icon, InfoBox } from '#blokkli/editor/components'

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

if (modelValue.value) {
  const date = new Date(modelValue.value)
  selectedDate.value = formatDate(date)
  selectedTime.value = formatTime(date)
}

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

watch([selectedDate, selectedTime], () => {
  if (!selectedDate.value) {
    modelValue.value = undefined
    return
  }

  const dateTimeString = `${selectedDate.value}T${selectedTime.value}:00`
  const date = new Date(dateTimeString)
  modelValue.value = date.toISOString()
})

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

function incrementHour() {
  const [hours = 0, minutes = 0] = selectedTime.value.split(':').map(Number)
  const newHours = minutes > 0 ? (hours + 1) % 24 : (hours + 1) % 24
  selectedTime.value = `${String(newHours).padStart(2, '0')}:00`
}

function decrementHour() {
  const [hours = 0, minutes = 0] = selectedTime.value.split(':').map(Number)
  const newHours = minutes > 0 ? hours : hours === 0 ? 23 : hours - 1
  selectedTime.value = `${String(newHours).padStart(2, '0')}:00`
}
</script>
