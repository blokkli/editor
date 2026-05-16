<template>
  <SplitView
    v-model:page="page"
    :items="items"
    :get-id="getId"
    :selected-id="selectedUuid"
    :conversation-uuid="selectedUuid"
    :is-list-loading="isLoading"
    :list-error="loadError"
    :empty-message="
      $t('agentConversationsListEmpty', 'No agent conversations yet.')
    "
    :empty-prompt="
      $t(
        'agentConversationsSelectPrompt',
        'Select a conversation from the list to view it.',
      )
    "
    :total-pages="totalPages"
  >
    <template #item="{ item }">
      <Item
        :item="item"
        @select="selectedUuid = item.uuid"
        @delete="onDelete(item.uuid)"
      />
    </template>
  </SplitView>
</template>

<script lang="ts" setup>
import { ref, useBlokkli } from '#imports'
import { useAgentPaginatedQuery } from '#blokkli/agent/app/composables'
import type { AgentConversationItem } from '#blokkli/agent/app/features/agent/types'
import SplitView from '../SplitView/index.vue'
import Item from './Item.vue'

const { adapter, $t } = useBlokkli()

const selectedUuid = ref<string | null>(null)

const { page, items, totalPages, isLoading, loadError, refresh } =
  await useAgentPaginatedQuery<AgentConversationItem>(
    () => adapter.agentConversations?.queryConversations,
    {
      missing: $t(
        'agentConversationsBackendMissing',
        'This backend does not expose the admin conversation list.',
      ),
      failed: $t(
        'agentConversationsListError',
        'Failed to load conversations.',
      ),
    },
  )

function getId(item: AgentConversationItem): string {
  return item.uuid
}

async function onDelete(uuid: string): Promise<void> {
  if (!adapter.agentConversations?.delete) return
  const confirmed = window.confirm(
    $t(
      'agentConversationsDeleteConfirm',
      'Delete this conversation? This cannot be undone.',
    ),
  )
  if (!confirmed) return
  try {
    await adapter.agentConversations.delete(uuid)
  } catch (e) {
    console.warn('[blokkli agent] Failed to delete conversation:', e)
    return
  }
  if (selectedUuid.value === uuid) {
    selectedUuid.value = null
  }
  await refresh()
}
</script>
