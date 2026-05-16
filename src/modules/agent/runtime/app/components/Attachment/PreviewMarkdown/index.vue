<template>
  <div class="whitespace-normal bk-agent-message-text" v-html="html" />
</template>

<script lang="ts" setup>
import { computed } from '#imports'
import { marked } from 'marked'

const props = defineProps<{
  content: string
}>()

const html = computed(() => {
  return marked.parse(props.content, { gfm: true, breaks: true }) as string
})
</script>
