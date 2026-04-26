<template>
  <FormToggle
    v-if="option.type === 'checkbox'"
    :label="option.label"
    :description="option.description"
    :model-value="!!(value ?? option.default)"
    @update:model-value="$emit('update', $event)"
  />
  <FormRadio
    v-else-if="option.type === 'radios'"
    :id="`chart-option-${optionKey}`"
    :label="option.label"
    :description="option.description"
    inline
    :options="radioOptions"
    :model-value="String(value ?? option.default ?? '')"
    @update:model-value="$emit('update', $event)"
  />
</template>

<script setup lang="ts">
import { computed } from '#imports'
import { FormToggle, FormRadio } from '#blokkli/editor/components'
import type { ChartTypeDefinition } from '../../../../chartTypes/types'

type ChartOption = ChartTypeDefinition['editor']['options'][string]

const props = defineProps<{
  optionKey: string
  option: ChartOption
  value: unknown
}>()

defineEmits<{ update: [value: unknown] }>()

const radioOptions = computed(() => {
  if (props.option.type !== 'radios') {
    return []
  }
  const opts = props.option.options as Record<
    string,
    string | { label: string }
  >
  return Object.entries(opts).map(([value, raw]) => ({
    value,
    label: typeof raw === 'string' ? raw : raw.label,
  }))
})
</script>
