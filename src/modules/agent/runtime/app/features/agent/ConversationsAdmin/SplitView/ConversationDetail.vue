<template>
  <div>
    <header class="pb-15 border-b border-mono-300 py-15 px-20">
      <h4 class="text-lg font-bold text-mono-900 mb-5">
        {{ parsed.title || $t('agentConversationsUntitled', 'Untitled') }}
      </h4>
      <div
        class="flex flex-wrap items-center gap-15 text-sm text-mono-600 [--bk-avatar-size:24px]"
      >
        <span class="flex items-center gap-5">
          <Avatar
            :deleted="!parsed.author"
            :name="parsed.author?.name || $t('userDeleted', '[deleted]')"
            :seed="parsed.author?.id"
            :image-url="parsed.author?.imageUrl"
          />
          {{ parsed.author?.name || $t('userDeleted', '[deleted]') }}
        </span>
        <span
          v-if="parsed.host?.label"
          class="flex items-center gap-3 truncate"
        >
          <Icon name="bk_mdi_link" class="size-15 text-mono-500" />
          <a
            v-if="parsed.host.editUrl"
            :href="parsed.host.editUrl"
            target="_blank"
            rel="noopener"
            class="text-accent-700 hover:underline"
          >
            {{ parsed.host.label }}
          </a>
          <span v-else>{{ parsed.host.label }}</span>
        </span>
        <span class="text-mono-500">
          <RelativeTime :timestamp="parsed.updatedAt" />
        </span>
      </div>
    </header>
    <div class="p-20">
      <Conversation
        :history="parsed.conversation"
        :active-item="null"
        :is-thinking="false"
        :tool-details="EMPTY_TOOL_DETAILS"
        :inline-feedback="parsed.feedback"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useBlokkli } from '#imports'
import { Avatar, Icon, RelativeTime } from '#blokkli/editor/components'
import Conversation from '#blokkli/agent/app/components/Conversation/index.vue'
import type { ParsedConversation } from '#blokkli/agent/app/helpers/parseConversationData'

const EMPTY_TOOL_DETAILS = new Map<string, unknown>()

defineProps<{
  parsed: ParsedConversation
}>()

const { $t } = useBlokkli()
</script>
