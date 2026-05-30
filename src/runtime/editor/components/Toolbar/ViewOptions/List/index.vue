<template>
  <div>
    <ViewOptionButton v-for="vo in options" :key="vo.id" v-bind="vo" />
  </div>
</template>

<script setup lang="ts">
import type { ViewOption } from '#blokkli/editor/providers/plugin'
import ViewOptionButton from './Button/index.vue'

defineProps<{
  options: ViewOption[]
}>()
</script>
