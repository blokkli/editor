<template>
  <ItemUser v-if="item.type === 'user'" v-bind="item" />
  <ItemAssistant v-else-if="item.type === 'assistant'" v-bind="item" />
  <ItemTool
    v-else-if="item.type === 'tool'"
    v-bind="item"
    :is-active="isActive"
    :details="toolItemDetails"
    :details-component="toolItemDetailsComponent"
  />
  <ItemServerTool v-else-if="item.type === 'server_tool'" v-bind="item" />
  <ItemError
    v-else-if="item.type === 'error'"
    v-bind="item"
    @retry="emit('retry')"
  />
  <ItemUnknown v-else-if="item.type === 'unknown'" v-bind="item" />
</template>

<script lang="ts" setup>
import { computed } from '#imports'
import ItemUser from './User/index.vue'
import ItemAssistant from './Assistant/index.vue'
import ItemTool from './Tool/index.vue'
import ItemServerTool from './ServerTool/index.vue'
import ItemError from './Error/index.vue'
import ItemUnknown from './Unknown/index.vue'
import type { ConversationItem } from '#blokkli/agent/app/types'
import { mcpTools } from '#blokkli-build/agent-client'

const props = defineProps<{
  item: ConversationItem
  isActive?: boolean
  toolDetails: Map<string, unknown>
}>()

const emit = defineEmits<{
  retry: []
}>()

const toolItemDetails = computed(() => {
  const item = props.item
  if (item.type !== 'tool') return undefined
  return props.toolDetails.get(item.callId)
})

const toolItemDetailsComponent = computed(() => {
  const item = props.item
  if (item.type !== 'tool' || !toolItemDetails.value) return undefined
  const tool = mcpTools.find((t) => t.name === item.tool)
  return tool?.detailsComponent
})
</script>
