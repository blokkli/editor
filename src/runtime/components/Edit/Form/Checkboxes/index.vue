<template>
  <div>
    <div class="bk-form-label">
      {{ label }}<span v-if="required" class="bk-required-indicator">*</span>
    </div>
    <div>
      <label v-for="option in options" :key="option.value" class="bk-checkbox">
        <input
          :checked="isChecked(option.value)"
          type="checkbox"
          :value="option.value"
          :required
          :disabled
          @change="toggleValue(option.value)"
        />
        <span>{{ option.label }}</span>
      </label>
    </div>
    <div v-if="description" class="bk-form-description">{{ description }}</div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  id: string
  label: string
  options: { value: string; label: string }[]
  required?: boolean
  disabled?: boolean
  description?: string
}>()

const value = defineModel<string[]>({ default: [] })

function isChecked(optionValue: string): boolean {
  return value.value.includes(optionValue)
}

function toggleValue(optionValue: string) {
  if (value.value.includes(optionValue)) {
    value.value = value.value.filter((v) => v !== optionValue)
  } else {
    value.value = [...value.value, optionValue]
  }
}
</script>
