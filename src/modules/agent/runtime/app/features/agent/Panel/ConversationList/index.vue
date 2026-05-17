<template>
  <div v-if="conversations.length">
    <PanelItem
      v-for="conv in conversations"
      :key="conv.uuid"
      :title="conv.title"
      is-button
      @click="emit('switch', conv.uuid)"
    >
      <template #description>
        <RelativeTime :timestamp="conv.updatedAt" />
      </template>
      <template #actions>
        <ButtonAction
          :label="$t('deleteConversation', 'Delete conversation')"
          icon="bk_mdi_delete"
          @click.stop="emit('delete', conv.uuid)"
        />
      </template>
    </PanelItem>
  </div>
  <div v-else class="text-sm text-mono-400 text-center py-20">
    {{ $t('aiAgentNoConversations', 'No past conversations.') }}
  </div>
</template>

<script lang="ts" setup>
import { useBlokkli } from '#imports'
import { RelativeTime } from '#blokkli/editor/components'
import type { AgentConversationItemSummary } from '#blokkli/agent/app/composables'
import PanelItem from '#blokkli/editor/components/Panel/Item/index.vue'
import ButtonAction from '#blokkli/editor/components/ButtonAction/index.vue'

defineProps<{
  conversations: AgentConversationItemSummary[]
}>()

const emit = defineEmits<{
  switch: [id: string]
  delete: [id: string]
  close: []
}>()

const { $t } = useBlokkli()
</script>
