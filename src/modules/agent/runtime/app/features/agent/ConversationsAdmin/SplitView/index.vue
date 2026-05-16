<template>
  <div class="grid grid-cols-5 gap-20">
    <div class="col-span-2">
      <PanelSection>
        <div class="h-[70vh] overflow-y-auto bk-scrollbar-light">
          <slot name="header" />
          <div class="overflow-y-auto">
            <div
              v-if="listError"
              class="flex items-center justify-center p-30 text-red-normal text-sm"
            >
              {{ listError }}
            </div>
            <ul v-else-if="items.length" class="flex flex-col">
              <li
                v-for="item in items"
                :key="getId(item)"
                class="flex items-stretch border-b border-mono-200"
                :class="
                  getId(item) === selectedId
                    ? 'bg-accent-50'
                    : 'bg-white hover:bg-mono-100'
                "
              >
                <slot
                  name="item"
                  :item="item"
                  :is-selected="getId(item) === selectedId"
                />
              </li>
            </ul>
            <div
              v-else-if="!isListLoading"
              class="flex items-center justify-center p-30 text-mono-600 text-sm"
            >
              {{ emptyMessage }}
            </div>
          </div>
          <div class="sticky bottom-0 z-50">
            <Pagination
              v-if="totalPages > 1"
              v-model="page"
              :total-pages="totalPages"
            />
          </div>
        </div>
      </PanelSection>
    </div>
    <div class="col-span-3">
      <PanelSection>
        <div
          class="flex-1 overflow-y-auto bk-scrollbar-light select-text h-[70vh]"
        >
          <ConversationDetail v-if="parsed" :parsed="parsed" />
          <div
            v-else-if="error"
            class="h-full flex items-center justify-center p-30 text-red-normal text-sm"
          >
            {{ error.message }}
          </div>
          <div
            v-else-if="status !== 'pending'"
            class="h-full flex flex-col items-center justify-center gap-10 p-30 text-mono-500 text-sm text-center"
          >
            <Icon name="bk_mdi_forum" class="size-50 text-mono-300" />
            <p>{{ emptyPrompt }}</p>
          </div>
        </div>
      </PanelSection>
    </div>
  </div>
</template>

<script lang="ts" setup generic="TItem">
import { computed, useAsyncData, useBlokkli } from '#imports'
import { Icon, Pagination } from '#blokkli/editor/components'
import { parseConversationData } from '#blokkli/agent/app/helpers/parseConversationData'
import type { ParsedConversation } from '#blokkli/agent/app/helpers/parseConversationData'
import ConversationDetail from './ConversationDetail.vue'
import PanelSection from '#blokkli/editor/components/Panel/Section/index.vue'

const props = defineProps<{
  items: TItem[]
  getId: (item: TItem) => string
  selectedId: string | null
  conversationUuid: string | null
  isListLoading: boolean
  listError: string | null
  emptyMessage: string
  emptyPrompt: string
  totalPages: number
}>()

const page = defineModel<number>('page', { required: true })

defineSlots<{
  header?: () => unknown
  item: (props: { item: TItem; isSelected: boolean }) => unknown
}>()

const { adapter, $t } = useBlokkli()

const conversationUuid = computed(() => props.conversationUuid)

const {
  data: parsed,
  status,
  error,
} = await useAsyncData<ParsedConversation | null>(
  async () => {
    const uuid = conversationUuid.value
    if (!uuid) return null

    const load = adapter.agentConversations?.load
    if (!load) {
      throw new Error(
        $t(
          'agentConversationsBackendMissing',
          'This backend does not expose the admin conversation list.',
        ),
      )
    }

    const data = await load(uuid).catch((e) => {
      console.warn('[blokkli agent] Failed to load conversation:', e)
      throw new Error(
        $t('agentConversationsDetailError', 'Failed to load conversation.'),
      )
    })

    if (!data) {
      throw new Error(
        $t(
          'agentConversationsDetailMissing',
          'Conversation could not be loaded.',
        ),
      )
    }

    const result = parseConversationData(data)
    if (!result) {
      throw new Error(
        $t(
          'agentConversationsDetailUnparseable',
          'Conversation data is malformed.',
        ),
      )
    }
    return result
  },
  { watch: [conversationUuid], default: () => null },
)
</script>
