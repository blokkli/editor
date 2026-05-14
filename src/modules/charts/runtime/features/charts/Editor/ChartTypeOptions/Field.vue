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
  <FormNumber
    v-else-if="option.type === 'number'"
    :id="`chart-option-${optionKey}`"
    :label="option.label"
    :description="option.description"
    :min="numberMin"
    :max="numberMax"
    :nullable="(option as { nullable?: boolean }).nullable"
    :model-value="numberValue"
    lazy
    @update:model-value="$emit('update', $event)"
  />
</template>

<script setup lang="ts">
import { computed } from '#imports'
import { FormToggle, FormRadio, FormNumber } from '#blokkli/editor/components'
import type { ChartTypeDefinition } from '../../../../chart-types/types'

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

const numberValue = computed<number | undefined>(() => {
  if (typeof props.value === 'number' && Number.isFinite(props.value)) {
    return props.value
  }
  if (typeof props.value === 'string' && props.value.trim() !== '') {
    const parsed = Number(props.value)
    if (Number.isFinite(parsed)) return parsed
  }
  if (
    props.option.type === 'number' &&
    typeof props.option.default === 'number'
  ) {
    return props.option.default
  }
  return undefined
})

const numberMin = computed(() => {
  if (props.option.type !== 'number') return undefined
  const opt = props.option as { min?: number }
  return typeof opt.min === 'number' ? opt.min : undefined
})

const numberMax = computed(() => {
  if (props.option.type !== 'number') return undefined
  const opt = props.option as { max?: number }
  return typeof opt.max === 'number' ? opt.max : undefined
})
</script>
