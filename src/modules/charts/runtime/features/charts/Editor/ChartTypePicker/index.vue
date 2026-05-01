<template>
  <div class="flex flex-1">
    <button
      v-for="option in chartTypes"
      :key="option.value"
      type="button"
      class="h-50 flex items-center text-mono-300 px-15 flex-1 justify-center group"
      :class="{ 'is-active': modelValue === option.value }"
      @click="emit('update:modelValue', option.value)"
    >
      <div
        class="flex items-center gap-8 text-base rounded-full px-10 py-3 group-hover:bg-mono-700 group-hover:text-mono-50"
        :class="{
          'bg-white! text-mono-950! font-semibold': modelValue === option.value,
        }"
      >
        <Icon :name="option.icon" class="size-20" />
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
