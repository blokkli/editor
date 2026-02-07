<template>
  <div class="bk-agent-debug-gallery">
    <h3>Conversation</h3>
    <Conversation
      :history="mockHistory"
      :active-item="mockActiveItem"
      :is-thinking="false"
    />

    <h3>Pending Mutations</h3>
    <PendingMutation
      v-for="action in mockMutations"
      :key="action.type"
      :action="action"
      @approve="() => {}"
      @reject="() => {}"
      @always-approve="() => {}"
    />

    <h3>Tool Components</h3>
    <component
      :is="tool.component"
      v-for="tool in toolsWithMockParams"
      :key="tool.name"
      :context="mockContext"
      :params="tool.mockParams()"
      @done="() => {}"
    />
  </div>
</template>

<script lang="ts" setup>
import { computed } from '#imports'
import Conversation from '../Conversation/index.vue'
import PendingMutation from '../PendingMutation/index.vue'
import type {
  ConversationItem,
  ActiveItem,
  MutationAction,
  McpToolContext,
} from '#blokkli/agent/app/types'
import { mcpTools } from '#blokkli-build/agent-client'
import { isToolDefinition } from '#blokkli/agent/app/helpers'

const mockContext: Partial<McpToolContext> = {
  app: null as any,
  itemEntityType: 'paragraph',
  adapter: {} as any,
}

// Flat conversation history - each item is immutable after being added
const mockHistory: ConversationItem[] = [
  {
    type: 'user',
    id: 'msg-1',
    content: 'Add a new text block with a welcome message to the hero section.',
    timestamp: Date.now() - 120000,
  },
  {
    type: 'tool',
    id: 'call-1',
    callId: 'call-1',
    tool: 'get_child_blocks',
    label: 'Get child blocks',
    status: 'success',
    timestamp: Date.now() - 118000,
  },
  {
    type: 'tool',
    id: 'call-2',
    callId: 'call-2',
    tool: 'add_block',
    label: 'Add block',
    status: 'success',
    timestamp: Date.now() - 116000,
  },
  {
    type: 'assistant',
    id: 'msg-2',
    content:
      "I've added a text block with a welcome message to your hero section.",
    timestamp: Date.now() - 115000,
  },
  {
    type: 'user',
    id: 'msg-3',
    content: 'Now delete the old introduction block.',
    timestamp: Date.now() - 90000,
  },
  {
    type: 'tool',
    id: 'call-3',
    callId: 'call-3',
    tool: 'delete_block',
    label: 'Delete block',
    status: 'error',
    timestamp: Date.now() - 88000,
  },
  {
    type: 'assistant',
    id: 'msg-4',
    content: 'I tried to delete the block but encountered an error.',
    timestamp: Date.now() - 85000,
  },
  {
    type: 'user',
    id: 'msg-5',
    content: 'Can you rewrite the title and move the card block?',
    timestamp: Date.now() - 60000,
  },
  {
    type: 'tool',
    id: 'call-4',
    callId: 'call-4',
    tool: 'batch_rewrite_text',
    label: 'Rewrite text',
    status: 'success',
    timestamp: Date.now() - 58000,
  },
]

// Single active item being built (streaming text, pending tool, or thinking)
const mockActiveItem: ActiveItem = {
  type: 'tool',
  id: 'call-5',
  callId: 'call-5',
  tool: 'move_block',
  label: 'Move block after hero section',
  timestamp: Date.now() - 55000,
}

const mockMutations: MutationAction[] = [
  {
    type: 'add',
    label: 'Add image block to content field',
    apply: () => undefined,
  },
  {
    type: 'delete',
    label: 'Delete text block "Introduction"',
    apply: () => undefined,
  },
  {
    type: 'move',
    label: 'Move card block after hero section',
    apply: () => undefined,
  },
  {
    type: 'rewrite',
    label: 'Rewrite title field content',
    apply: () => undefined,
  },
]

const toolsWithMockParams = computed(() =>
  mcpTools
    .filter(isToolDefinition)
    .filter(
      (tool): tool is typeof tool & { mockParams: () => unknown } =>
        !!tool.component && !!tool.mockParams,
    ),
)
</script>
