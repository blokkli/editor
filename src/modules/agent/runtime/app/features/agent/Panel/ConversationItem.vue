<template>
  <div v-if="item.type === 'user'" class="bk-agent-message bk-is-user">
    <div ref="contentEl" class="bk-agent-message-text" />
  </div>

  <div
    v-else-if="item.type === 'assistant'"
    class="bk-agent-message bk-is-assistant bk-agent-assistant-bubble"
  >
    <div ref="contentEl" class="bk-agent-message-text" />
  </div>

  <div
    v-else-if="item.type === 'server_tool'"
    class="bk-agent-assistant-bubble bk-is-tool bk-is-server-tool"
  >
    <div class="bk-agent-tool-call bk-is-server-tool">
      <Icon
        :name="getServerSideToolIcon(item.tool)"
        class="bk-agent-tool-call-status"
      />
      <span>{{ serverToolLabel }}</span>
    </div>
  </div>

  <div
    v-else-if="item.type === 'tool'"
    class="bk-agent-assistant-bubble bk-is-tool"
  >
    <div class="bk-agent-tool-call" :class="toolStatusClass">
      <Icon v-if="isActive" name="loader" class="bk-agent-tool-call-status" />
      <Icon
        v-else-if="toolStatus === 'success'"
        name="bk_mdi_check"
        class="bk-agent-tool-call-status"
      />
      <Icon
        v-else-if="toolStatus === 'error'"
        name="bk_mdi_exclamation"
        class="bk-agent-tool-call-status"
      />
      <span class="bk-agent-tool-call-name">{{
        item.label || formatToolName(item.tool)
      }}</span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch, nextTick, computed, useBlokkli } from '#imports'
import { Icon } from '#blokkli/editor/components'
import { marked } from 'marked'
import type {
  ConversationItem,
  AssistantActiveItem,
  ToolActiveItem,
  ToolConversationItem,
  ServerToolConversationItem,
} from '#blokkli/agent/app/types'
import type { BlokkliIcon } from '#blokkli-build/icons'

type ItemProp =
  | ConversationItem
  | AssistantActiveItem
  | ToolActiveItem
  | ServerToolConversationItem

// Type guard to check if tool item has status (is finalized)
function isToolFinalized(
  item: ToolConversationItem | ToolActiveItem,
): item is ToolConversationItem {
  return 'status' in item
}

const props = defineProps<{
  item: ItemProp
  isActive?: boolean
}>()

const { $t } = useBlokkli()

const contentEl = ref<HTMLElement>()

marked.setOptions({ gfm: true, breaks: true })

function renderContent(content: string) {
  const container = contentEl.value
  if (!container) return
  container.innerHTML = marked.parse(content) as string
}

// Watch content changes for user/assistant messages
watch(
  () => {
    if (props.item.type === 'user' || props.item.type === 'assistant') {
      return props.item.content
    }
    return null
  },
  async (content) => {
    if (content) {
      await nextTick()
      renderContent(content)
    }
  },
  { immediate: true },
)

// Get the tool status safely (handles both finalized and active tool items)
const toolStatus = computed(() => {
  if (props.item.type !== 'tool') return null
  if (props.isActive) return 'pending'
  return isToolFinalized(props.item) ? props.item.status : 'pending'
})

const toolStatusClass = computed(() => {
  if (props.item.type !== 'tool') return ''
  if (props.isActive) return 'bk-is-pending'
  return toolStatus.value ? `bk-is-${toolStatus.value}` : 'bk-is-pending'
})

const serverToolLabel = computed(() => {
  if (props.item.type !== 'server_tool') return ''
  if (props.item.tool === 'load_skill') {
    return $t('aiAgentLoadSkill', 'Using skill "@label"').replace(
      '@label',
      props.item.label,
    )
  }
  if (props.item.tool === 'load_tools') {
    return $t('aiAgentLoadTools', '@count tools loaded').replace(
      '@count',
      props.item.label,
    )
  }
  return props.item.label
})

function formatToolName(tool: string): string {
  return tool.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function getServerSideToolIcon(
  id: ServerToolConversationItem['tool'],
): BlokkliIcon {
  if (id === 'load_skill') {
    return 'bk_mdi_lightbulb-fill'
  }

  return 'bk_mdi_build-fill'
}
</script>
