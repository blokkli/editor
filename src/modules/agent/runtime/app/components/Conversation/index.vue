<template>
  <div @click="onClick">
    <template v-for="item in history" :key="item.id">
      <ConversationItemComponent
        :item="item"
        :tool-details
        @retry="emit('retry')"
      />
      <InlineFeedback
        v-for="entry in feedbackByItemId.get(item.id)"
        :key="entry.id"
        :entry="entry"
      />
    </template>
    <ConversationItemComponent
      v-if="activeItem"
      :key="activeItem.id"
      :item="activeItem"
      :tool-details
      is-active
    />
    <Thinking v-if="isThinking" />
  </div>
</template>

<script lang="ts" setup>
import { computed, useBlokkli } from '#imports'
import ConversationItemComponent from './Item/index.vue'
import Thinking from './Thinking/index.vue'
import InlineFeedback from './InlineFeedback/index.vue'
import type { ConversationItem, ActiveItem } from '#blokkli/agent/app/types'
import type { AgentConversationFeedbackItem } from '#blokkli/agent/app/features/agent/types'

const props = defineProps<{
  history: ConversationItem[]
  activeItem: ActiveItem | null
  isThinking: boolean
  toolDetails: Map<string, unknown>
  inlineFeedback?: AgentConversationFeedbackItem[]
}>()

const feedbackByItemId = computed(() => {
  const map = new Map<string, AgentConversationFeedbackItem[]>()
  for (const f of props.inlineFeedback ?? []) {
    const bucket = map.get(f.itemId)
    if (bucket) bucket.push(f)
    else map.set(f.itemId, [f])
  }
  return map
})

const emit = defineEmits<{
  retry: []
}>()

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const { eventBus, dom, blocks } = useBlokkli()

function onClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (target.tagName !== 'A') return

  const href = target.getAttribute('href')
  if (!href || !href.startsWith('#')) return

  const uuid = href.slice(1)
  if (!UUID_REGEX.test(uuid)) return

  e.preventDefault()
  eventBus.emit('scrollIntoView', { uuid, center: true })

  const block = blocks.getBlock(uuid)
  if (!block) return
  const element = dom.getDragElement(block)
  if (!element) return

  eventBus.emit('highlight', element)
}
</script>
