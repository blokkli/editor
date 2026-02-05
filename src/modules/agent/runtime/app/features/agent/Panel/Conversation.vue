<template>
  <div class="bk-agent-conversation">
    <ConversationItem v-for="item in history" :key="item.id" :item="item" />
    <ConversationItem
      v-if="activeItem"
      :key="activeItem.id"
      :item="activeItem"
      is-active
    />
    <div
      v-if="isThinking"
      class="bk-agent-message bk-is-assistant bk-agent-assistant-bubble"
    >
      <div class="bk-agent-message-content">
        <div class="bk-agent-thinking">
          <Icon name="loader" />
          <span>{{ $t('aiAgentThinking', 'Thinking...') }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useBlokkli } from '#imports'
import { Icon } from '#blokkli/editor/components'
import ConversationItem from './ConversationItem.vue'
import type {
  ConversationItem as ConversationItemType,
  ActiveItem,
} from '#blokkli/agent/app/types'

defineProps<{
  history: ConversationItemType[]
  activeItem: ActiveItem | null
  isThinking: boolean
}>()

const { $t } = useBlokkli()
</script>
