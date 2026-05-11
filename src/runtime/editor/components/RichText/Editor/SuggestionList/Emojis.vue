<template>
  <SuggestionList
    ref="listRef"
    :items="items"
    :command="command"
    :get-payload="getPayload"
  >
    <template #item="{ item }">
      <span v-if="item.emoji" class="text-base leading-none">{{
        item.emoji
      }}</span>
      <img
        v-else-if="item.fallbackImage"
        :src="item.fallbackImage"
        :alt="item.name"
        class="size-15"
      />
      <span class="text-mono-600">:{{ item.name }}:</span>
    </template>
  </SuggestionList>
</template>

<script lang="ts" setup>
import { useTemplateRef } from '#imports'
import SuggestionList from './index.vue'

export type EmojiItem = {
  name: string
  emoji?: string
  fallbackImage?: string
  shortcodes?: string[]
  tags?: string[]
}
type EmojiPayload = { name: string }

defineProps<{
  items: EmojiItem[]
  command: (payload: EmojiPayload) => void
}>()

const listRef = useTemplateRef<{
  onKeyDown: (p: { event: KeyboardEvent }) => boolean
}>('listRef')

function getPayload(item: EmojiItem): EmojiPayload {
  return { name: item.name }
}

function onKeyDown(p: { event: KeyboardEvent }): boolean {
  return listRef.value?.onKeyDown(p) ?? false
}

defineExpose({ onKeyDown })
</script>

<script lang="ts">
export default {
  name: 'EmojiList',
}
</script>
