<template>
  <DialogModal
    id="agentConversations"
    :title="$t('agentConversationsTitle', 'Agent conversations')"
    icon="bk_mdi_forum"
    :width="1200"
    hide-buttons
    mono
    @cancel="emit('cancel')"
  >
    <template #tabs>
      <Tabs v-model="tab" :tabs mono />
    </template>
    <div class="relative">
      <ConversationsTab v-if="tab === 'conversations'" />
      <RatingsTab v-else />
    </div>
  </DialogModal>
</template>

<script lang="ts" setup>
import { ref, computed, useBlokkli } from '#imports'
import { DialogModal, Tabs } from '#blokkli/editor/components'
import ConversationsTab from './ConversationsTab/index.vue'
import RatingsTab from './RatingsTab/index.vue'

const emit = defineEmits<{ cancel: [] }>()

const { $t } = useBlokkli()

type TabId = 'conversations' | 'ratings'

const tab = ref<TabId>('conversations')

const tabs = computed<{ id: TabId; label: string }[]>(() => [
  {
    id: 'conversations',
    label: $t('agentConversationsTabConversations', 'Conversations'),
  },
  {
    id: 'ratings',
    label: $t('agentConversationsTabRatings', 'Ratings'),
  },
])
</script>

<script lang="ts">
export default {
  name: 'AgentConversationsDialog',
}
</script>
