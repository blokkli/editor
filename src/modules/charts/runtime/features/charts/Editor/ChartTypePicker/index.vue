<template>
  <div class="bk-chart-type-picker">
    <button
      v-for="option in chartTypes"
      :key="option.value"
      type="button"
      :class="{ 'is-active': modelValue === option.value }"
      @click="emit('update:modelValue', option.value)"
    >
      <div>
        <Icon :name="option.icon" />
        <span>{{ option.label }}</span>
      </div>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, useBlokkli } from '#imports'
import type { ChartType } from '../../../../types'
import { getChartTypes } from '../../../../chartTypes'
import { Icon } from '#blokkli/editor/components'

defineProps<{
  modelValue: ChartType
}>()

const emit = defineEmits<{
  'update:modelValue': [value: ChartType]
}>()

const { $t } = useBlokkli()

const chartTypes = computed(() =>
  getChartTypes($t).map((def) => ({
    value: def.id as ChartType,
    label: def.editor.label,
    icon: def.editor.icon,
  })),
)
</script>
