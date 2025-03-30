<template>
  <label class="bk-checkbox-toggle">
    <input v-model="value" type="checkbox" class="peer" :disabled />
    <div class="bk-checkbox-toggle-toggle" />
    <div class="bk-checkbox-toggle-label">
      <div>{{ label }}</div>
      <div v-if="description">
        {{ description }}
      </div>
    </div>
  </label>
</template>

<script setup lang="ts">
defineProps<{
  label: string
  description?: string
  disabled?: boolean
}>()

const value = defineModel<boolean>()
</script>
