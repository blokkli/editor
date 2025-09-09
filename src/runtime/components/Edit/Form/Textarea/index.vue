<template>
  <div>
    <label class="bk-form-label" :for="id">
      {{ label }}
    </label>
    <textarea
      v-model.lazy="value"
      class="bk-form-input"
      :id
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
  id: string
  label: string
  description?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
}>()

const value = defineModel<string>()
</script>
