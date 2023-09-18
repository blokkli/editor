<template>
  <kbd>
    <template v-if="meta"> <kbd>CTRL</kbd> + </template>
    <kbd>{{ keyLabel }}</kbd>
  </kbd>
</template>

<script lang="ts" setup>
defineProps<{
  meta?: boolean
  keyLabel: string
}>()
</script>
