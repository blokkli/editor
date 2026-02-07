<template>
  <div class="bk-agent-conversation">
    <ConversationItemComponent
      v-for="item in history"
      :key="item.id"
      :item="item"
    />
    <ConversationItemComponent
      v-if="activeItem"
      :key="activeItem.id"
      :item="activeItem"
      is-active
    />
    <Thinking v-show="isThinking" />
  </div>
</template>

<script lang="ts" setup>
import ConversationItemComponent from './Item/index.vue'
import Thinking from './Thinking/index.vue'
import type { ConversationItem, ActiveItem } from '#blokkli/agent/app/types'

defineProps<{
  history: ConversationItem[]
  activeItem: ActiveItem | null
  isThinking: boolean
}>()
</script>
