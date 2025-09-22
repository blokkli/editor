<template>
  <div>
    <label class="bk-form-label" :for="id">
      {{ label }}
    </label>
    <textarea
      :id
      v-model.lazy="value"
      class="bk-form-input"
      :placeholder
      :required
      :disabled
      :rows="rows ?? 5"
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
  rows?: string | number
}>()

const value = defineModel<string>()
</script>
