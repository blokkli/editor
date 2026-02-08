<template>
  <div class="bk-agent-message bk-is-user">
    <div ref="contentEl" class="bk-agent-message-text" />
  </div>
</template>

<script lang="ts" setup>
import { ref, watch, nextTick } from '#imports'
import { marked } from 'marked'
const props = defineProps<{
  id: string
  timestamp: number
  type: 'user'
  content: string
}>()

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
