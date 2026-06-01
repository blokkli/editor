<template>
  <div>
    <ViewOptionButton
      v-for="option in options"
      :key="option.id"
      v-bind="option"
    />
  </div>
</template>

<script setup lang="ts">
import type { ViewOption } from '#blokkli/editor/providers/plugin'
import ViewOptionButton from './Button/index.vue'

defineProps<{
  options: ViewOption[]
}>()
</script>
