<template>
  <div class="bk-agent-assistant-bubble bk-is-tool">
    <div class="bk-agent-tool-call" :class="toolStatusClass">
      <div class="bk-agent-tool-call-inner">
        <StatusIcon :status="toolStatus" />
        <span class="bk-agent-tool-call-name">{{
          label || formatToolName(tool)
        }}</span>
        <button
          v-if="details != null && detailsComponent"
          class="bk-agent-tool-details-toggle"
          :class="{ 'bk-is-expanded': isExpanded }"
          @click="isExpanded = !isExpanded"
        >
          <Icon name="bk_mdi_keyboard_arrow_down" />
        </button>
      </div>
      <TransitionHeight
        v-if="details != null && detailsComponent"
        :duration="200"
        opacity
      >
        <div v-if="isExpanded" class="bk-agent-tool-details">
          <div class="bk-agent-tool-details-inner">
            <component :is="detailsComponent" :details="details" />
          </div>
        </div>
      </TransitionHeight>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, type Component } from '#imports'
import { StatusIcon, Icon, TransitionHeight } from '#blokkli/editor/components'
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

const isExpanded = ref(false)

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
