<template>
  <SplitView
    v-model:page="page"
    :items="items"
    :get-id="getId"
    :selected-id="selectedRatingId"
    :conversation-uuid="selectedConversationUuid"
    :is-list-loading="isLoading"
    :list-error="loadError"
    :empty-message="$t('agentRatingsEmpty', 'No ratings yet.')"
    :empty-prompt="
      $t(
        'agentRatingsSelectPrompt',
        'Select a rating to view the conversation it was given on.',
      )
    "
    :total-pages="totalPages"
  >
    <template #header>
      <div
        v-if="items.length"
        class="px-15 py-15 border-b border-mono-200 bg-white"
      >
        <div class="flex items-center gap-15">
          <DonutChart
            :data="chartData"
            :center-text="String(items.length)"
            class="text-mono-700"
          />
          <ul class="flex-1 flex flex-col gap-5">
            <li
              v-for="opt in optionsReversed"
              :key="opt.value"
              class="flex items-center gap-5 text-xs"
              :class="'bk-scheme-' + opt.theme"
            >
              <Icon :name="opt.icon" class="size-[14px] text-scheme-normal" />
              <span class="font-medium text-mono-700">{{ opt.label }}</span>
              <span class="ml-auto font-semibold text-mono-900">
                {{ aggregates[opt.value].count }}
              </span>
              <span class="text-mono-500">
                ({{ aggregates[opt.value].percent }}%)
              </span>
            </li>
          </ul>
        </div>
      </div>
    </template>

    <template #item="{ item }">
      <Item :item="item" @select="onSelect(item)" />
    </template>
  </SplitView>
</template>

<script lang="ts" setup>
import { ref, computed, useBlokkli } from '#imports'
import { DonutChart, Icon } from '#blokkli/editor/components'
import { rgbaToString } from '#blokkli/editor/helpers/color'
import {
  useAgentFeedbackOptions,
  useAgentPaginatedQuery,
} from '#blokkli/agent/app/composables'
import type {
  AgentConversationFeedbackRating,
  AgentConversationFeedbackItem,
} from '#blokkli/agent/app/features/agent/types'
import SplitView from '../SplitView/index.vue'
import Item from './Item.vue'

const { adapter, $t, theme } = useBlokkli()

const ratingOptions = useAgentFeedbackOptions()

const selectedRatingId = ref<string | null>(null)
const selectedConversationUuid = ref<string | null>(null)

const { page, items, totalPages, isLoading, loadError } =
  await useAgentPaginatedQuery<AgentConversationFeedbackItem>(
    () => adapter.agentConversations?.queryFeedback,
    {
      missing: $t(
        'agentRatingsBackendMissing',
        'This backend does not expose the ratings list.',
      ),
      failed: $t('agentRatingsListError', 'Failed to load ratings.'),
    },
  )

const aggregates = computed<
  Record<AgentConversationFeedbackRating, { count: number; percent: number }>
>(() => {
  const counts: Record<AgentConversationFeedbackRating, number> = {
    bad: 0,
    fine: 0,
    good: 0,
  }
  for (const e of items.value) counts[e.rating]++
  const total = items.value.length || 1
  return {
    bad: { count: counts.bad, percent: Math.round((counts.bad / total) * 100) },
    fine: {
      count: counts.fine,
      percent: Math.round((counts.fine / total) * 100),
    },
    good: {
      count: counts.good,
      percent: Math.round((counts.good / total) * 100),
    },
  }
})

const optionsReversed = computed(() => [...ratingOptions.value].reverse())

const chartData = computed(() =>
  optionsReversed.value.map((opt) => ({
    label: opt.label,
    value: aggregates.value[opt.value].count,
    color: rgbaToString(theme[opt.theme].value.normal),
  })),
)

function getId(item: AgentConversationFeedbackItem): string {
  return item.id
}

function onSelect(item: AgentConversationFeedbackItem): void {
  selectedRatingId.value = item.id
  selectedConversationUuid.value = item.conversationUuid
}
</script>
