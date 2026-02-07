<template>
  <div class="bk-agent-message bk-is-assistant bk-agent-assistant-bubble">
    <div ref="contentEl" class="bk-agent-message-text" />
  </div>
</template>

<script lang="ts" setup>
import { ref, watch, nextTick } from '#imports'
import { marked } from 'marked'
import type { AssistantConversationItem } from '#blokkli/agent/app/types'

const props = defineProps<AssistantConversationItem>()

const contentEl = ref<HTMLElement>()

marked.setOptions({ gfm: true, breaks: true })

function renderContent(content: string) {
  const container = contentEl.value
  if (!container) return
  container.innerHTML = marked.parse(content) as string
}

watch(
  () => props.content,
  async (content) => {
    if (content) {
      await nextTick()
      renderContent(content)
    }
  },
  { immediate: true },
)
</script>
