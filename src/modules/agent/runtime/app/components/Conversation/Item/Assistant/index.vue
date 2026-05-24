<template>
  <div class="bk-agent-message bk-is-assistant bk-agent-assistant-bubble">
    <Markdown class="bk-agent-message-text" :content="renderedContent" />
  </div>
</template>

<script lang="ts" setup>
import { computed, useBlokkli } from '#imports'
import Markdown from '#blokkli/agent/app/components/Markdown/index.vue'
import { PLACEHOLDER_USER_NAME } from '#blokkli/agent/shared/placeholders'

const props = defineProps<{
  id: string
  timestamp: number
  type: 'assistant'
  content: string
}>()

const { state } = useBlokkli()

const renderedContent = computed(() =>
  props.content.replaceAll(PLACEHOLDER_USER_NAME, state.owner.value?.name || ''),
)
</script>
