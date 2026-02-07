<template>
  <ItemUser v-if="item.type === 'user'" v-bind="item" />
  <ItemAssistant v-else-if="item.type === 'assistant'" v-bind="item" />
  <ItemTool
    v-else-if="item.type === 'tool'"
    v-bind="item"
    :is-active="isActive"
  />
  <ItemServerTool v-else-if="item.type === 'server_tool'" v-bind="item" />
  <ItemError v-else-if="item.type === 'error'" v-bind="item" />
</template>

<script lang="ts" setup>
import ItemUser from './User/index.vue'
import ItemAssistant from './Assistant/index.vue'
import ItemTool from './Tool/index.vue'
import ItemServerTool from './ServerTool/index.vue'
import ItemError from './Error/index.vue'
import type { ConversationItem } from '#blokkli/agent/app/types'

defineProps<{
  item: ConversationItem
  isActive?: boolean
}>()
</script>
