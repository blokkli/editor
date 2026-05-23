<template>
  <div class="whitespace-normal bk-agent-message-text" v-html="html" />
</template>

<script lang="ts" setup>
import { computed } from '#imports'
import { renderMarkdown } from '#blokkli/agent/app/helpers/markdown'

const props = defineProps<{
  content: string
}>()

const html = computed(() => renderMarkdown(props.content))
</script>
