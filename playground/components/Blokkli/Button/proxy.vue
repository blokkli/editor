<template>
  <div>
    <span v-blokkli-editable:title>{{ title }}</span>
  </div>
</template>

<script lang="ts" setup>
defineProps<{
  url: string
  title: string
}>()
</script>
