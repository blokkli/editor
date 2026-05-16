<template>
  <div>
    <div v-if="label" class="bk-form-label">
      {{ label }}<span v-if="required" class="bk-required-indicator">*</span>
    </div>
    <div :class="{ 'bk-radio-inline': inline }">
      <label v-for="option in options" :key="option.value" class="bk-radio">
        <input
          v-model="value"
          type="radio"
          :value="option.value"
          :required
          :name="id"
          :disabled
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
  label?: string
  options: { value: string; label: string }[]
  required?: boolean
  disabled?: boolean
  description?: string
  inline?: boolean
}>()

const value = defineModel<string>()
</script>
