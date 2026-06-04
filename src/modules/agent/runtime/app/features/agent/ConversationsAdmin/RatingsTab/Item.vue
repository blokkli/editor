<template>
  <button
    type="button"
    class="flex-1 flex items-start gap-10 p-10 text-left min-w-0 [--bk-avatar-size:24px]"
    @click="emit('select')"
  >
    <span
      class="shrink-0 size-25 rounded-full flex items-center justify-center"
      :class="'bk-scheme-' + option.theme"
    >
      <span
        class="size-20 rounded-full flex items-center justify-center bg-scheme-normal text-scheme-text"
      >
        <Icon :name="option.icon" class="size-[12px]" />
      </span>
    </span>
    <span class="flex flex-col gap-2 min-w-0 flex-1">
      <span v-if="item.comment" class="text-sm text-mono-900 line-clamp-2">
        {{ item.comment }}
      </span>
      <span v-else class="text-sm text-mono-500 italic">
        {{ $t('agentRatingsNoComment', 'No comment') }}
      </span>
      <span class="text-xs text-mono-500 flex items-center gap-5 mt-3">
        <Avatar
          :deleted="!item.author"
          :name="item.author?.name || `[${$t('deleted', 'deleted')}]`"
          :seed="item.author?.id"
          :image-url="item.author?.imageUrl"
        />
        <span class="truncate">{{
          item.author?.name || `[${$t('deleted', 'deleted')}]`
        }}</span>
        <span class="ml-auto shrink-0">
          <RelativeTime :timestamp="item.createdAt" />
        </span>
      </span>
    </span>
  </button>
</template>

<script lang="ts" setup>
import { computed, useBlokkli } from '#imports'
import { Avatar, Icon, RelativeTime } from '#blokkli/editor/components'
import { useAgentFeedbackOptions } from '#blokkli/agent/app/composables'
import type { AgentConversationFeedbackItem } from '#blokkli/agent/app/features/agent/types'

const props = defineProps<{
  item: AgentConversationFeedbackItem
}>()

const emit = defineEmits<{ select: [] }>()

const { $t } = useBlokkli()
const options = useAgentFeedbackOptions()

const option = computed(
  () =>
    options.value.find((o) => o.value === props.item.rating) ??
    options.value[0]!,
)
</script>
