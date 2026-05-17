<template>
  <BubbleTool :status="toolStatus" :text :expandable="!!detailsComponent">
    <component
      :is="detailsComponent"
      v-if="detailsComponent"
      :details="details"
    />
  </BubbleTool>
</template>

<script lang="ts" setup>
import { computed, type Component } from '#imports'
import BubbleTool from '../Bubble/Tool/index.vue'

const props = defineProps<{
  id: string
  timestamp: number
  type: 'tool'
  callId: string
  tool: string
  label: string
  status: 'active' | 'success' | 'error'
  isActive?: boolean
  details?: unknown
  detailsComponent?: Component
}>()

const toolStatus = computed(() => {
  if (props.isActive) return 'active'
  return props.status
})

const text = computed(() => {
  return props.label || formatToolName(props.tool)
})

function formatToolName(tool: string): string {
  return tool.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
</script>
