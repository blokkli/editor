<template>
  <div
    class="bk-agent-inline-feedback flex items-center gap-10 p-10 my-10 rounded-xl border border-mono-200"
  >
    <span
      class="shrink-0 size-25 rounded-full flex items-center justify-center bg-scheme-normal text-scheme-text mt-2"
      :class="'bk-scheme-' + option.theme"
    >
      <Icon :name="option.icon" class="size-[14px]" />
    </span>
    <div class="flex-1 min-w-0">
      <div
        class="text-sm"
        :class="{
          'italic text-mono-500': !entry.comment,
          'text-mono-900': entry.comment,
        }"
      >
        {{ entry.comment || $t('agentRatingsNoComment', 'No comment') }}
      </div>
      <div class="text-xs text-mono-500 flex items-center gap-5 flex-wrap">
        <RelativeTime :timestamp="entry.createdAt" />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, useBlokkli } from '#imports'
import { Icon, RelativeTime } from '#blokkli/editor/components'
import { useAgentFeedbackOptions } from '#blokkli/agent/app/composables'
import type { AgentConversationFeedbackItem } from '#blokkli/agent/app/features/agent/types'

const props = defineProps<{
  entry: AgentConversationFeedbackItem
}>()

const { $t } = useBlokkli()

const options = useAgentFeedbackOptions()

const option = computed(
  () =>
    options.value.find((o) => o.value === props.entry.rating) ??
    options.value[0]!,
)
</script>
