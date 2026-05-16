<template>
  <div class="bk-agent-message bk-is-user">
    <div v-if="html" class="bk-agent-message-text" v-html="html" />
    <div
      v-if="attachments?.length"
      class="grid gap-8"
      :class="{ 'mt-10': html }"
    >
      <AttachmentChip
        v-for="att in attachments"
        :key="att.id"
        :attachment="att"
        inverted
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from '#imports'
import { marked } from 'marked'
import AttachmentChip from '../../../Attachment/index.vue'
import type { Attachment } from '#blokkli/agent/app/types'

const props = defineProps<{
  id: string
  timestamp: number
  type: 'user'
  content: string
  attachments?: Attachment[]
}>()

const html = computed(() => {
  return props.content
    ? (marked.parse(props.content, { gfm: true, breaks: true }) as string)
    : ''
})
</script>
