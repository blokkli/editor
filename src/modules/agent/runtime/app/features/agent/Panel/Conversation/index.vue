<template>
  <div class="bk-agent-conversation" @click="onClick">
    <ConversationItemComponent
      v-for="item in history"
      :key="item.id"
      :item="item"
      :tool-details
      @retry="emit('retry')"
    />
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
import ConversationItemComponent from './Item/index.vue'
import Thinking from './Thinking/index.vue'
import { useBlokkli } from '#imports'
import type { ConversationItem, ActiveItem } from '#blokkli/agent/app/types'

const _props = defineProps<{
  history: ConversationItem[]
  activeItem: ActiveItem | null
  isThinking: boolean
  toolDetails: Map<string, unknown>
}>()

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
