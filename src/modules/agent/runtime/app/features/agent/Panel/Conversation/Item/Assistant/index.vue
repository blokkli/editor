<template>
  <div class="bk-agent-message bk-is-assistant bk-agent-assistant-bubble">
    <div ref="contentEl" class="bk-agent-message-text" />
  </div>
</template>

<script lang="ts" setup>
import { ref, watch, nextTick, useBlokkli } from '#imports'
import { marked } from 'marked'
import { PLACEHOLDER_USER_NAME } from '#blokkli/agent/shared/placeholders'

const props = defineProps<{
  id: string
  timestamp: number
  type: 'assistant'
  content: string
}>()

const { state } = useBlokkli()

const contentEl = ref<HTMLElement>()

function renderContent(content: string) {
  const container = contentEl.value
  if (!container) return
  const ownerName = state.owner.value?.name || ''
  container.innerHTML = marked.parse(
    content.replaceAll(PLACEHOLDER_USER_NAME, ownerName),
    { gfm: true, breaks: true },
  ) as string
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
