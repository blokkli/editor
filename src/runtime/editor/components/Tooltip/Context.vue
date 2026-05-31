<template>
  <div class="mt-8 text-xs w-full" data-test="tooltip-status">
    <strong data-test="tooltip-status-label">{{ label }}</strong>
    <span v-if="description" data-test="tooltip-status-description"
      >: {{ description }}</span
    >
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label: string
  description?: string
}>()
</script>
