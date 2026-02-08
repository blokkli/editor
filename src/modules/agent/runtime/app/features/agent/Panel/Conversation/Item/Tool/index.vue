<template>
  <div class="bk-agent-assistant-bubble bk-is-tool">
    <div class="bk-agent-tool-call" :class="toolStatusClass">
      <StatusIcon :status="toolStatus" />
      <span class="bk-agent-tool-call-name">{{
        label || formatToolName(tool)
      }}</span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from '#imports'
import { StatusIcon } from '#blokkli/editor/components'
const props = defineProps<{
  id: string
  timestamp: number
  type: 'tool'
  callId: string
  tool: string
  label: string
  status: 'active' | 'success' | 'error'
  isActive?: boolean
}>()

const toolStatus = computed(() => {
  if (props.isActive) return 'active'
  return props.status
})

const toolStatusClass = computed(() => {
  const status = toolStatus.value
  if (status === 'active') return 'bk-is-pending'
  return `bk-is-${status}`
})

function formatToolName(tool: string): string {
  return tool.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
</script>
