<template>
  <div class="bk-agent-conversation-list">
    <div class="bk-agent-conversation-list-header">
      <span>{{ $t('aiAgentPastConversations', 'Past conversations') }}</span>
      <button @click="emit('close')">
        <Icon name="bk_mdi_close" />
      </button>
    </div>
    <div
      v-if="conversations.length"
      class="bk-agent-conversation-list-items bk-scrollbar-light"
    >
      <div
        v-for="conv in conversations"
        :key="conv.uuid"
        class="bk-agent-conversation-list-item"
        @click="emit('switch', conv.uuid)"
      >
        <div class="bk-agent-conversation-list-item-content">
          <div class="bk-agent-conversation-list-item-text">
            {{ conv.title }}
          </div>
          <span class="bk-agent-conversation-list-item-time">
            <RelativeTime :timestamp="conv.updatedAt" />
          </span>
        </div>
        <button
          class="bk-agent-conversation-list-item-delete"
          :title="$t('aiAgentDeleteConversation', 'Delete conversation')"
          @click.stop="emit('delete', conv.uuid)"
        >
          <Icon name="bk_mdi_delete" />
        </button>
      </div>
    </div>
    <div v-else class="bk-agent-conversation-list-empty">
      {{ $t('aiAgentNoConversations', 'No past conversations.') }}
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useBlokkli } from '#imports'
import { Icon, RelativeTime } from '#blokkli/editor/components'
import type { AgentConversationSummary } from '#blokkli/agent/app/composables'

defineProps<{
  conversations: AgentConversationSummary[]
}>()

const emit = defineEmits<{
  switch: [id: string]
  delete: [id: string]
  close: []
}>()

const { $t } = useBlokkli()
</script>
