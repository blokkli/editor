<template>
  <div class="bk-agent-assistant-bubble bk-is-tool">
    <div class="bk-agent-tool-call" :class="toolStatusClass">
      <Icon v-if="isActive" name="loader" class="bk-agent-tool-call-status" />
      <Icon
        v-else-if="toolStatus === 'success'"
        name="bk_mdi_check"
        class="bk-agent-tool-call-status"
      />
      <Icon
        v-else-if="toolStatus === 'error'"
        name="bk_mdi_priority_high"
        class="bk-agent-tool-call-status"
      />
      <span class="bk-agent-tool-call-name">{{
        label || formatToolName(tool)
      }}</span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from '#imports'
import { Icon } from '#blokkli/editor/components'
import type {
  ToolConversationItem,
  ToolActiveItem,
} from '#blokkli/agent/app/types'

const props = defineProps<
  (ToolConversationItem | ToolActiveItem) & { isActive?: boolean }
>()

const toolStatus = computed(() => {
  if (props.isActive) return 'pending'
  return 'status' in props ? props.status : 'pending'
})

const toolStatusClass = computed(() => {
  if (props.isActive) return 'bk-is-pending'
  return toolStatus.value ? `bk-is-${toolStatus.value}` : 'bk-is-pending'
})

function formatToolName(tool: string): string {
  return tool.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
</script>
