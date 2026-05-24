<template>
  <Markdown class="whitespace-normal bk-agent-message-text" :content />
</template>

<script lang="ts" setup>
import Markdown from '#blokkli/agent/app/components/Markdown/index.vue'

defineProps<{
  content: string
}>()
</script>
