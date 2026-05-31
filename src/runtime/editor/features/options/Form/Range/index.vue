<template>
  <div class="bk-blokkli-item-options-range" data-test="option-type-range">
    <input
      v-model="text"
      type="range"
      :min="min"
      :max="max"
      :step="step"
      data-test="range-input"
    />
    <div data-test="range-value">{{ formatted }}</div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from '#imports'

const props = defineProps<{
  label: string
  modelValue?: number
  min: number
  max: number
  step: number
}>()

const emit = defineEmits(['update:modelValue'])

const text = computed<string>({
  get() {
    return String(props.modelValue ?? 0)
  },
  set(v: string | number | undefined) {
    emit('update:modelValue', Number(v) || 0)
  },
})

const formatted = computed(() => {
  const numValue = props.modelValue ?? 0

  // Determine the precision of the step
  const stepPrecision = (props.step.toString().split('.')[1] || '').length

  // Format the number to match the step precision
  return numValue.toFixed(stepPrecision)
})
</script>

<script lang="ts">
export default {
  name: 'OptionsFormRange',
}
</script>
