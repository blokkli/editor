<template>
  <!-- eslint-disable-next-line vue/no-v-html -- markdown, sanitised by renderMarkdown() -->
  <div v-html="html" />
</template>

<script lang="ts" setup>
import { computed } from '#imports'
import { renderMarkdown } from '#blokkli/agent/app/helpers/markdown'

const props = defineProps<{
  content: string
}>()

const html = computed(() =>
  props.content ? renderMarkdown(props.content) : '',
)
</script>
