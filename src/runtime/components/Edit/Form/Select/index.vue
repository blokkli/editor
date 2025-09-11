<template>
  <div>
    <label class="bk-form-label" :for="id">
      {{ label }}
    </label>
    <select :id v-model="value" class="bk-form-input" :required :disabled>
      <option
        v-for="option in options"
        :key="option.value"
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </select>
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

const value = defineModel<string>()
</script>
