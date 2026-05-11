<template>
  <SuggestionList
    ref="listRef"
    :items="items"
    :command="command"
    :get-payload="getPayload"
  >
    <template #item="{ item }">
      <span class="font-medium">{{ item.label }}</span>
    </template>
  </SuggestionList>
</template>

<script lang="ts" setup>
import { useTemplateRef } from '#imports'
import SuggestionList from './index.vue'

export type MentionItem = { id: string; label: string }
type MentionPayload = { id: string; label: string }

defineProps<{
  items: MentionItem[]
  command: (payload: MentionPayload) => void
}>()

const listRef = useTemplateRef<{
  onKeyDown: (p: { event: KeyboardEvent }) => boolean
}>('listRef')

function getPayload(item: MentionItem): MentionPayload {
  return { id: item.id, label: item.label }
}

function onKeyDown(p: { event: KeyboardEvent }): boolean {
  return listRef.value?.onKeyDown(p) ?? false
}

defineExpose({ onKeyDown })
</script>

<script lang="ts">
export default {
  name: 'MentionList',
}
</script>
