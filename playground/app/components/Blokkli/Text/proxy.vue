<template>
  <div>
    <div v-blokkli-editable:text v-html="text" />
  </div>
</template>

<script lang="ts" setup>
defineProps<{
  text: string
}>()
</script>
