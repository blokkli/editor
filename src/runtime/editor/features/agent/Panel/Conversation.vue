<template>
  <div class="bk-agent-conversation">
    <div
      v-for="message in messages"
      :key="message.id"
      class="bk-agent-message"
      :class="'bk-is-' + message.role"
    >
      <div class="bk-agent-message-avatar">
        <Icon v-if="message.role === 'user'" name="bk_mdi_person" />
        <Icon v-else name="stars" />
      </div>
      <div class="bk-agent-message-content">
        <div
          v-if="message.content"
          class="bk-agent-message-text"
          v-html="formatMessage(message.content)"
        />
        <div v-if="message.toolCalls?.length" class="bk-agent-message-tools">
          <div
            v-for="tool in message.toolCalls"
            :key="tool.id"
            class="bk-agent-tool-call"
            :class="'bk-is-' + tool.status"
          >
            <Icon
              :name="getToolIcon(tool.tool)"
              class="bk-agent-tool-call-icon"
            />
            <span class="bk-agent-tool-call-name">{{
              formatToolName(tool.tool)
            }}</span>
            <Icon
              v-if="tool.status === 'pending'"
              name="loader"
              class="bk-agent-tool-call-status"
            />
            <Icon
              v-else-if="tool.status === 'success'"
              name="bk_mdi_check"
              class="bk-agent-tool-call-status"
            />
            <Icon
              v-else-if="tool.status === 'error'"
              name="bk_mdi_error"
              class="bk-agent-tool-call-status"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { Icon } from '#blokkli/editor/components'
import type { AgentMessage } from '../types'
import type { BlokkliIcon } from '#blokkli-build/icons'

defineProps<{
  messages: AgentMessage[]
}>()

function formatMessage(content: string): string {
  // Basic markdown-like formatting
  return content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>')
}

function formatToolName(tool: string): string {
  return tool.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function getToolIcon(tool: string): BlokkliIcon {
  switch (tool) {
    case 'get_block_info':
    case 'get_editable_fields':
    case 'get_children':
    case 'get_block_fields':
    case 'get_page_structure':
    case 'get_available_bundles':
      return 'bk_mdi_search'
    case 'rewrite_text':
      return 'bk_mdi_edit'
    case 'add_block':
      return 'bk_mdi_add'
    case 'delete_block':
      return 'bk_mdi_delete'
    case 'move_block':
      return 'bk_mdi_drag_pan'
    default:
      return 'bk_mdi_settings'
  }
}
</script>
