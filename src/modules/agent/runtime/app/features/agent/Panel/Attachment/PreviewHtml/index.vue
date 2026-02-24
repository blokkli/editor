<template>
  <div class="bk-agent-attachment-rendered bk-agent-message-text" v-html="content" />
</template>

<script lang="ts" setup>
defineProps<{
  content: string
}>()
</script>
