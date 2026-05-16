<template>
  <div class="whitespace-normal bk-agent-message-text" v-html="content" />
</template>

<script lang="ts" setup>
defineProps<{
  content: string
}>()
</script>
