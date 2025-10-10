<template>
  <div
    class="bk-datepicker"
    :class="{
      'bk-is-invalid': error,
    }"
  >
    <div class="bk-datepicker-header">
      <button
        type="button"
        class="bk-datepicker-nav"
        :disabled="!canGoPrevious"
        @click="previousMonth"
      >
        <Icon name="arrow-left" />
      </button>
      <div class="bk-datepicker-title">{{ monthName }} {{ currentYear }}</div>
      <button
        type="button"
        class="bk-datepicker-nav"
        :disabled="!canGoNext"
        @click="nextMonth"
      >
        <Icon name="arrow-right" />
      </button>
    </div>
    <div class="bk-datepicker-weekdays">
      <div v-for="day in weekdays" :key="day" class="bk-datepicker-weekday">
        {{ day }}
      </div>
    </div>
    <div class="bk-datepicker-days">
      <button
        v-for="day in calendarDays"
        :key="day.key"
        type="button"
        class="bk-datepicker-day"
        :disabled="disabled || day.isDisabled"
        @click="selectDate(day)"
      >
        <div
          class="bk-datepicker-day-inner"
          :class="{
            'bk-is-other-month': !day.isCurrentMonth,
            'bk-is-today': day.isToday,
            'bk-is-selected': day.isSelected,
            'bk-is-disabled': day.isDisabled,
          }"
        >
          {{ day.day }}
        </div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, useBlokkli } from '#imports'
import { Icon } from '#blokkli/components'

const props = defineProps<{
  min?: string
  max?: string
  disabled?: boolean
  error?: boolean
}>()

const { ui } = useBlokkli()

const modelValue = defineModel<string>()

const weekdays = computed(() => {
  const formatter = new Intl.DateTimeFormat(ui.locale.value, {
    weekday: 'short',
  })
  const days: string[] = []
  // Start from Monday (2023-01-02 was a Monday)
  for (let i = 0; i < 7; i++) {
    const date = new Date(2023, 0, 2 + i)
    days.push(formatter.format(date))
  }
  return days
})

const monthNames = computed(() => {
  const formatter = new Intl.DateTimeFormat(ui.locale.value, { month: 'long' })
  const months: string[] = []
  for (let i = 0; i < 12; i++) {
    const date = new Date(2023, i, 1)
    months.push(formatter.format(date))
  }
  return months
})

// Initialize with current date or selected date
const initDate = modelValue.value ? new Date(modelValue.value) : new Date()
const currentMonth = ref(initDate.getMonth())
const currentYear = ref(initDate.getFullYear())

const monthName = computed(() => monthNames.value[currentMonth.value])

const canGoPrevious = computed(() => {
  if (props.disabled) {
    return false
  }

  if (!props.min) {
    return true
  }

  // Check if the last day of the previous month is before min date
  const prevMonth = currentMonth.value === 0 ? 11 : currentMonth.value - 1
  const prevYear =
    currentMonth.value === 0 ? currentYear.value - 1 : currentYear.value
  const lastDayOfPrevMonth = new Date(prevYear, prevMonth + 1, 0)
  const lastDayString = formatDate(lastDayOfPrevMonth)

  return lastDayString >= props.min
})

const canGoNext = computed(() => {
  if (props.disabled) {
    return false
  }

  if (!props.max) {
    return true
  }

  // Check if the first day of the next month is after max date
  const nextMonth = currentMonth.value === 11 ? 0 : currentMonth.value + 1
  const nextYear =
    currentMonth.value === 11 ? currentYear.value + 1 : currentYear.value
  const firstDayOfNextMonth = new Date(nextYear, nextMonth, 1)
  const firstDayString = formatDate(firstDayOfNextMonth)

  return firstDayString <= props.max
})

function previousMonth() {
  if (currentMonth.value === 0) {
    currentMonth.value = 11
    currentYear.value--
  } else {
    currentMonth.value--
  }
}

function nextMonth() {
  if (currentMonth.value === 11) {
    currentMonth.value = 0
    currentYear.value++
  } else {
    currentMonth.value++
  }
}

interface CalendarDay {
  day: number
  date: Date
  dateString: string
  key: string
  isCurrentMonth: boolean
  isToday: boolean
  isSelected: boolean
  isDisabled: boolean
}

const calendarDays = computed<CalendarDay[]>(() => {
  const firstDay = new Date(currentYear.value, currentMonth.value, 1)
  const lastDay = new Date(currentYear.value, currentMonth.value + 1, 0)

  // Get day of week (0 = Sunday, 1 = Monday, etc.)
  // We want Monday = 0, so adjust
  let firstDayOfWeek = firstDay.getDay() - 1
  if (firstDayOfWeek < 0) firstDayOfWeek = 6

  const days: CalendarDay[] = []

  // Add days from previous month
  const prevMonthLastDay = new Date(currentYear.value, currentMonth.value, 0)
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const day = prevMonthLastDay.getDate() - i
    const date = new Date(currentYear.value, currentMonth.value - 1, day)
    days.push(createCalendarDay(date, false))
  }

  // Add days from current month
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(currentYear.value, currentMonth.value, day)
    days.push(createCalendarDay(date, true))
  }

  // Add days from next month to complete the grid
  const remainingDays = 42 - days.length // 6 weeks * 7 days
  for (let day = 1; day <= remainingDays; day++) {
    const date = new Date(currentYear.value, currentMonth.value + 1, day)
    days.push(createCalendarDay(date, false))
  }

  return days
})

function createCalendarDay(date: Date, isCurrentMonth: boolean): CalendarDay {
  const dateString = formatDate(date)
  const today = new Date()
  const todayString = formatDate(today)

  let isDisabled = false

  if (props.min && dateString < props.min) {
    isDisabled = true
  }

  if (props.max && dateString > props.max) {
    isDisabled = true
  }

  return {
    day: date.getDate(),
    date,
    dateString,
    key: dateString,
    isCurrentMonth,
    isToday: dateString === todayString,
    isSelected: dateString === modelValue.value,
    isDisabled,
  }
}

function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function selectDate(day: CalendarDay) {
  if (day.isDisabled || props.disabled) {
    return
  }
  modelValue.value = day.dateString
}

// Watch for external changes to modelValue and update current month/year
watch(modelValue, (newValue) => {
  if (newValue) {
    const date = new Date(newValue)
    currentMonth.value = date.getMonth()
    currentYear.value = date.getFullYear()
  }
})
</script>
