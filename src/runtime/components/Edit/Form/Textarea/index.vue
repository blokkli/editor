<template>
  <div>
    <label class="bk-form-label">
      {{ label }}
    </label>
    <textarea
      v-model="value"
      class="bk-form-input"
      :placeholder="placeholder"
      :required
      :disabled
      rows="5"
    />
    <div v-if="description" class="bk-form-description">{{ description }}</div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label: string
  description?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
}>()

const value = defineModel<string>()
</script>
