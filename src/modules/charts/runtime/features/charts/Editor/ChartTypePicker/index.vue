<template>
  <div class="bk-chart-type-picker">
    <button
      v-for="option in chartTypes"
      :key="option.value"
      type="button"
      :class="{ 'is-active': modelValue === option.value }"
      @click="emit('update:modelValue', option.value)"
    >
      <Icon :name="option.icon" />
      <span>{{ option.label }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, useBlokkli } from '#imports'
import type { ChartType } from '../../../../types'
import type { BlokkliIcon } from '#blokkli-build/icons'
import { Icon } from '#blokkli/editor/components'

defineProps<{
  modelValue: ChartType
}>()

const emit = defineEmits<{
  'update:modelValue': [value: ChartType]
}>()

const { $t } = useBlokkli()

const chartTypes = computed<
  { value: ChartType; label: string; icon: BlokkliIcon }[]
>(() => [
  { value: 'bar', label: $t('chartsTypeBar', 'Bar'), icon: 'bk_mdi_bar_chart' },
  { value: 'line', label: $t('chartsTypeLine', 'Line'), icon: 'bk_mdi_show_chart' },
  { value: 'pie', label: $t('chartsTypePie', 'Pie'), icon: 'bk_mdi_pie_chart' },
  { value: 'area', label: $t('chartsTypeArea', 'Area'), icon: 'bk_mdi_area_chart' },
  { value: 'donut', label: $t('chartsTypeDonut', 'Donut'), icon: 'bk_mdi_donut_large' },
  { value: 'heatmap', label: $t('chartsTypeHeatmap', 'Heatmap'), icon: 'bk_mdi_grid_view' },
])
</script>
