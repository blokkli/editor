<template>
  <div class="mt-8 text-xs w-full">
    <strong>{{ label }}</strong>
    <span v-if="description">: {{ description }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label: string
  description?: string
}>()
</script>
