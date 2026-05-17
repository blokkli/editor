<template>
  <button
    type="button"
    class="flex-1 flex items-start gap-10 p-10 text-left min-w-0 [--bk-avatar-size:30px]"
    @click="emit('select')"
  >
    <Avatar
      :name="item.author.name"
      :seed="item.author.id"
      :image-url="item.author.imageUrl"
    />
    <span class="flex flex-col gap-2 min-w-0 flex-1">
      <span class="text-sm font-medium text-mono-900 truncate">
        {{ item.title || $t('agentConversationsUntitled', 'Untitled') }}
      </span>
      <span class="text-xs text-mono-600 truncate flex gap-2">
        <span>{{ item.author.name }}</span>
        <span v-if="item.host?.label" class="truncate">
          · {{ item.host.label }}
        </span>
      </span>
      <span class="text-xs text-mono-500">
        <RelativeTime :timestamp="item.updatedAt" />
      </span>
    </span>
  </button>
  <div class="shrink-0 flex items-center px-5 relative">
    <ButtonAction
      :label="$t('deleteConversation', 'Delete conversation')"
      icon="bk_mdi_delete"
      theme="danger"
      @click.stop="emit('delete')"
    />
  </div>
</template>

<script lang="ts" setup>
import { useBlokkli } from '#imports'
import { Avatar, ButtonAction, RelativeTime } from '#blokkli/editor/components'
import type { AgentConversationItem } from '#blokkli/agent/app/features/agent/types'

defineProps<{
  item: AgentConversationItem
}>()

const emit = defineEmits<{
  select: []
  delete: []
}>()

const { $t } = useBlokkli()
</script>
