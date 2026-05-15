<template>
  <div class="grid grid-cols-2 gap-15 p-15">
    <TypeCard
      v-for="option in chartTypes"
      :key="option.id"
      v-bind="option"
      :active="option.id === modelValue"
      @click="modelValue = option.id"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, useBlokkli } from '#imports'
import type { ChartType, ChartTypeDefinition } from '../../../../types'
import { getChartTypes } from '../../../../chart-types'
import TypeCard from './TypeCard.vue'

const modelValue = defineModel<ChartType>({ required: true })

const { $t } = useBlokkli()

const chartTypes = computed<ChartTypeDefinition[]>(() =>
  getChartTypes($t).sort((a, b) =>
    a.editor.label.localeCompare(b.editor.label),
  ),
)
</script>
