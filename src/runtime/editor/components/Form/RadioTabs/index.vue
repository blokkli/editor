<template>
  <div>
    <div class="bk-form-label">
      {{ label }}<span v-if="required" class="bk-required-indicator">*</span>
    </div>
    <div
      class="bk-radio-tabs"
      :class="scheme ? 'bk-scheme-' + scheme : undefined"
    >
      <label v-for="option in options" :key="option.value">
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
import type { ThemeColorName } from './../../../../../shared/types/theme'

defineProps<{
  id: string
  label: string
  options: { value: string; label: string }[]
  required?: boolean
  disabled?: boolean
  description?: string
  scheme?: ThemeColorName
}>()

const value = defineModel<string>()
</script>
