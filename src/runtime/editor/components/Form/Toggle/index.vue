<template>
  <label class="bk-checkbox-toggle">
    <slot />
    <input v-model="value" type="checkbox" class="peer" :disabled />
    <div class="bk-checkbox-toggle-toggle" />
    <div v-if="label || description" class="bk-checkbox-toggle-label">
      <div v-if="label">{{ label }}</div>
      <div v-if="description">
        {{ description }}
      </div>
    </div>
  </label>
</template>

<script setup lang="ts">
defineProps<{
  label?: string
  description?: string
  disabled?: boolean
}>()

const value = defineModel<boolean>()
</script>
