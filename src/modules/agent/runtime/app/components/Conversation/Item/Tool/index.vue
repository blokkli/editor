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
          class="shrink-0 size-18 flex items-center justify-center rounded text-mono-500 hover:text-mono-900 hover:bg-mono-200"
          :class="{ 'bk-is-expanded': isExpanded }"
          @click="isExpanded = !isExpanded"
        >
          <Icon
            name="bk_mdi_keyboard_arrow_down"
            class="size-15 fill-current transition-transform duration-200 ease-swing"
            :class="{
              'rotate-180': isExpanded,
            }"
          />
        </button>
      </div>
      <TransitionHeight
        v-if="details != null && detailsComponent"
        :duration="200"
        opacity
      >
        <div v-if="isExpanded" class="bk-agent-tool-details">
          <div class="pt-10">
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
