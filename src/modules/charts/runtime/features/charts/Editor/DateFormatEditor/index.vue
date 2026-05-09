<template>
  <FormItem>
    <FormSelect
      id="chart-date-style"
      :label="$t('chartsDateFormat', 'Date format')"
      :options="styleOptions"
      :model-value="format.style ?? 'auto'"
      @update:model-value="
        update(
          'style',
          $event === 'auto' ? undefined : ($event as ChartDateFormatStyle),
        )
      "
    />
  </FormItem>
</template>

<script setup lang="ts">
import { computed, useBlokkli } from '#imports'
import type { ChartDateFormat, ChartDateFormatStyle } from '../../../../types'
import {
  detectDateFormat,
  formatDateCategory,
} from '../../../../helpers/dateFormat'
import { FormSelect, FormItem } from '#blokkli/editor/components'

const { $t } = useBlokkli()

const props = defineProps<{
  format: ChartDateFormat
  categories: string[]
  locale?: string
}>()

const emit = defineEmits<{
  'update:format': [value: ChartDateFormat]
}>()

function update<K extends keyof ChartDateFormat>(
  key: K,
  value: ChartDateFormat[K] | undefined,
) {
  const next: ChartDateFormat = { ...props.format }
  if (value === undefined) {
    next[key] = undefined
  } else {
    next[key] = value
  }
  emit('update:format', next)
}

const detected = computed(() => detectDateFormat(props.categories))
const sample = computed(
  () => props.categories.find((c) => c.trim().length > 0) ?? '',
)

function toOption(
  style: ChartDateFormatStyle,
  label?: string,
): { value: ChartDateFormatStyle; label: string } {
  if (!detected.value || !sample.value)
    return { value: style, label: label || style }
  const ex = formatDateCategory(
    sample.value,
    detected.value,
    { style },
    props.locale,
  )
  if (!label) {
    return { value: style, label: ex }
  }
  return { value: style, label: ex ? `${label} [${ex}]` : label }
}

const styleOptions = computed(() => [
  toOption('none', $t('chartsDateFormatStyleNone', 'No formatting')),
  toOption('auto', $t('chartsDateFormatStyleAuto', 'Auto')),
  toOption('monthYearShort'),
  toOption('monthYearLong'),
  toOption('monthOnly'),
  toOption('monthYearNumeric'),
  toOption('iso'),
  toOption('dateShort'),
  toOption('dateLong'),
  toOption('yearOnly'),
])
</script>
