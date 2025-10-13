<template>
  <div>
    <label class="bk-form-label" :for="id">
      {{ label }}<span v-if="required" class="bk-required-indicator">*</span>
    </label>
    <input
      :id
      v-model.lazy="value"
      type="text"
      class="bk-form-input"
      :placeholder
      :required
      :disabled
      :minlength
      :maxlength
    />
    <div v-if="description" class="bk-form-description">{{ description }}</div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  id: string
  label: string
  description?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  minlength?: string | number
  maxlength?: string | number
  type?: string
}>()

const value = defineModel<string>()
</script>
