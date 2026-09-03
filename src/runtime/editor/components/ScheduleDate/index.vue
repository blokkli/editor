<template>
  <div class="flex-1 flex gap-20" data-test="schedule-date">
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
        class="mb-20 px-10 font-bold text-lg bg-mono-100 h-[52px] flex items-center"
        data-test="schedule-preview"
      >
        {{ formattedDateTime || '\u00A0' }}
      </div>
      <div class="flex gap-10 items-stretch">
        <input
          id="schedule-time"
          v-model="selectedTime"
          type="time"
          data-test="schedule-time"
          class="bk-form-input flex-1 w-full tabular-nums"
          :disabled="disabled"
          :class="{
            'bk-is-invalid': error || isTimeInvalid,
          }"
          :data-test-invalid="isTimeInvalid"
        />
        <button
          type="button"
          class="bk-button bk-scheme-mono bk-is-icon-only shrink-0 px-10 [&_.bk-icon]:size-15 [&_.bk-icon_svg]:size-full [&_.bk-icon_svg]:fill-current"
          :disabled="disabled"
          data-test="schedule-hour-decrement"
          @click="decrementHour"
        >
          <Icon name="bk_mdi_remove" />
        </button>
        <button
          type="button"
          class="bk-button bk-scheme-mono bk-is-icon-only shrink-0 px-10 [&_.bk-icon]:size-15 [&_.bk-icon_svg]:size-full [&_.bk-icon_svg]:fill-current"
          :disabled="disabled"
          data-test="schedule-hour-increment"
          @click="incrementHour"
        >
          <Icon name="bk_mdi_add" />
        </button>
      </div>

      <InfoBox
        v-if="error"
        :text="error"
        class="mt-20"
        color="red"
        small
        data-test="schedule-error"
      />
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, useBlokkli } from '#imports'
import { FormDatepicker, Icon, InfoBox } from '#blokkli/editor/components'
import {
  isValidDate,
  toDateInputValue,
  toTimeInputValue,
  parseTime,
  composeLocalDateTime,
} from '#blokkli/editor/helpers/date'

const { ui } = useBlokkli()

defineProps<{
  disabled?: boolean
  error?: string
}>()

const DEFAULT_TIME = '12:00'
const DEFAULT_PARSED_TIME = { hours: 12, minutes: 0 }

const modelValue = defineModel<string>()

const selectedDate = ref('')
const selectedTime = ref(DEFAULT_TIME)

const selectedDateTime = computed(() =>
  composeLocalDateTime(selectedDate.value, selectedTime.value),
)

const isTimeInvalid = computed(
  () => !!selectedDate.value && !parseTime(selectedTime.value),
)

const formattedDateTime = computed(() => {
  if (!selectedDateTime.value) {
    return ''
  }

  return ui.formatDate(selectedDateTime.value, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
})

const minDate = computed(() => toDateInputValue(new Date()))

watch(selectedDateTime, (date) => {
  modelValue.value = date ? date.toISOString() : undefined
})

watch(
  modelValue,
  (newValue) => {
    // Ignore echoes of our own output so an in-progress edit (e.g. a cleared
    // time input) is not reset from the outside.
    if (newValue === selectedDateTime.value?.toISOString()) {
      return
    }

    const date = newValue ? new Date(newValue) : null
    if (!date || !isValidDate(date)) {
      selectedDate.value = ''
      selectedTime.value = DEFAULT_TIME
      return
    }

    selectedDate.value = toDateInputValue(date)
    selectedTime.value = toTimeInputValue(date)
  },
  { immediate: true },
)

function setHour(hours: number) {
  selectedTime.value = `${String(hours).padStart(2, '0')}:00`
}

function incrementHour() {
  const { hours } = parseTime(selectedTime.value) ?? DEFAULT_PARSED_TIME
  setHour((hours + 1) % 24)
}

function decrementHour() {
  const { hours, minutes } =
    parseTime(selectedTime.value) ?? DEFAULT_PARSED_TIME
  // Round down to the full hour first, only then step back.
  setHour(minutes > 0 ? hours : (hours + 23) % 24)
}
</script>
