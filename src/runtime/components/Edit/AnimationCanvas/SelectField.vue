<template>
  <select v-model="value">
    <option v-for="option in options" :key="option" :value="option">
      {{ option }}
    </option>
  </select>
</template>

<script setup lang="ts">
const props = defineProps<{
  options: string[]
}>()
const value = defineModel<string>()
</script>
