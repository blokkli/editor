<template>
  <div class="bk-agent-debug-gallery">
    <h3>Conversation</h3>
    <Conversation
      :history="mockHistory"
      :active-item="mockActiveItem"
      :is-thinking="false"
      :tool-details="mockToolDetails"
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
    <template v-for="tool in toolsWithMockParams" :key="tool.name">
      <component
        :is="tool.component"
        :context="mockContext"
        :params="tool.mockParams()"
        @done="() => {}"
      />
      <component
        :is="tool.component"
        v-for="(variant, i) in tool.mockParamsVariants?.() ?? []"
        :key="`${tool.name}-variant-${i}`"
        :context="mockContext"
        :params="variant"
        @done="() => {}"
      />
    </template>
  </div>
</template>

<script lang="ts" setup>
import { computed } from '#imports'
import Conversation from '#blokkli/agent/app/components/Conversation/index.vue'
import PendingMutation from '../PendingMutation/index.vue'
import type {
  ConversationItem,
  ActiveItem,
  MutationAction,
  McpToolContext,
} from '#blokkli/agent/app/types'
import { mcpTools } from '#blokkli-build/agent-client'

const mockContext: Partial<McpToolContext> = {
  app: null as any,
  itemEntityType: 'paragraph',
  adapter: {} as any,
  pageContext: null,
}

// Flat conversation history - each item is immutable after being added.
// Designed to cover every Conversation item variant in a realistic flow:
// user, assistant, tool (success/error), server_tool (all 5 variants),
// and a tool with expandable details (see mockToolDetails below).
const mockHistory: ConversationItem[] = [
  {
    type: 'user',
    id: 'msg-1',
    content: 'Help me restructure the page content.',
    timestamp: Date.now() - 120000,
  },
  {
    type: 'server_tool',
    id: 'srv-1',
    tool: 'load_skills',
    label: 'Editing blocks',
    timestamp: Date.now() - 119000,
  },
  {
    type: 'server_tool',
    id: 'srv-2',
    tool: 'load_tools',
    label: '12',
    timestamp: Date.now() - 118500,
  },
  {
    type: 'server_tool',
    id: 'srv-3',
    tool: 'create_plan',
    label: 'Restructure page content',
    timestamp: Date.now() - 118000,
  },
  {
    type: 'tool',
    id: 'call-1',
    callId: 'call-1',
    tool: 'get_child_blocks',
    label: 'Get child blocks',
    status: 'success',
    timestamp: Date.now() - 117000,
  },
  {
    type: 'server_tool',
    id: 'srv-4',
    tool: 'complete_plan_step',
    label: 'Analyze current page structure',
    timestamp: Date.now() - 116500,
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
    content: 'Now rewrite the title and tagline.',
    timestamp: Date.now() - 100000,
  },
  {
    type: 'tool',
    id: 'call-4',
    callId: 'call-4',
    tool: 'update_text_fields',
    label: 'Rewrite text',
    status: 'success',
    timestamp: Date.now() - 98000,
  },
  {
    type: 'user',
    id: 'msg-4',
    content: 'Delete the old introduction block and move the card block.',
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
    id: 'msg-5',
    content: 'I tried to delete the block but encountered an error.',
    timestamp: Date.now() - 85000,
  },
  {
    type: 'server_tool',
    id: 'srv-5',
    tool: 'plan_completed',
    label: 'Restructure page content',
    timestamp: Date.now() - 80000,
  },
]

// Single active item being built (streaming text, pending tool, or thinking)
const mockActiveItem: ActiveItem = {
  type: 'tool',
  id: 'call-5',
  callId: 'call-5',
  tool: 'move_block',
  label: 'Move block after hero section',
  status: 'active',
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
  // {
  //   type: 'rewrite',
  //   label: 'Rewrite title field content',
  //   apply: () => undefined,
  // },
]

// Details payload for tool items that have a detailsComponent.
// `update_text_fields` (call-4) renders the rewrite diff list.
const mockToolDetails = new Map<string, unknown>([
  [
    'call-4',
    [
      {
        fieldLabel: 'Title',
        before: 'Old welcome heading',
        after: 'New, sharper welcome heading',
      },
      {
        fieldLabel: 'Tagline',
        before: 'A short intro line.',
        after: 'A punchier, shorter intro.',
      },
    ],
  ],
])

const toolsWithMockParams = computed(() =>
  mcpTools.filter(
    (tool): tool is typeof tool & { mockParams: () => unknown } =>
      !!tool.component && !!tool.mockParams,
  ),
)
</script>
