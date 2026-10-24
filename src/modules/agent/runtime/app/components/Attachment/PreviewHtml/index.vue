<template>
  <!-- eslint-disable-next-line vue/no-v-html -- a dropped file, sanitised -->
  <div class="whitespace-normal bk-agent-message-text" v-html="html" />
</template>

<script lang="ts" setup>
import { computed } from '#imports'
import { sanitizeHtml } from '#blokkli/editor/helpers/html'

const props = defineProps<{
  content: string
}>()

// The file comes from whoever dropped it, and is stored with the conversation.
const html = computed(() => sanitizeHtml(props.content, 'richText'))
</script>
