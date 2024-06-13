<template>
  <div class="bk-blokkli-item-options-range">
    <input v-model="text" type="range" :min="min" :max="max" :step="step" />
    <div class="bk-blokkli-item-options-range-label">{{ formatted }}</div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from '#imports'

const props = defineProps<{
  label: string
  modelValue: string
  min: number
  max: number
  step: number
}>()

const emit = defineEmits(['update:modelValue'])

const text = computed<string>({
  get() {
    return props.modelValue || ''
  },
  set(v: string | number | undefined) {
    emit('update:modelValue', (v === undefined ? '' : v).toString())
  },
})

const formatted = computed(() => {
  // Ensure the value is treated as a number
  const numValue =
    typeof text.value === 'string' ? parseFloat(text.value) : text.value

  // Determine the precision of the step
  const stepPrecision = (props.step.toString().split('.')[1] || '').length

  // Format the number to match the step precision
  const formattedValue = numValue.toFixed(stepPrecision)

  return formattedValue
})
</script>

<script lang="ts">
export default {
  name: 'OptionsFormRange',
}
</script>
