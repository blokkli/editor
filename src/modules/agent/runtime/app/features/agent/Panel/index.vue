<template>
  <div
    class="bk bk-agent-panel"
    @mousedown.capture.stop
    @pointerdown.capture.stop
    @pointerup.capture.stop
    @mouseup.capture.stop
    @contextmenu.capture.stop
  >
    <div
      ref="scrollContainer"
      class="bk-agent-panel-inner bk-scrollbar-light"
      @scroll="onScroll"
    >
      <div class="bk-agent-panel-conversation">
        <!-- Debug styling gallery -->
        <DebugGallery v-if="debugStyling" />

        <!-- Normal mode -->
        <template v-else>
          <!-- Conversation history with active item -->
          <Conversation
            v-if="history.length || activeItem || isThinking"
            :history
            :active-item
            :is-thinking
          />

          <!-- Interactive tool component -->
          <component
            v-if="pendingToolComponent && pendingToolCall"
            :is="pendingToolComponent"
            :context="toolContext"
            :params="pendingToolCall.params"
            @done="(result: unknown) => $emit('tool-component-done', result)"
          />

          <!-- Default pending mutation approval -->
          <PendingMutation
            v-else-if="pendingMutation && !autoApprove"
            :action="pendingMutation.action"
            @approve="$emit('approve')"
            @reject="$emit('reject')"
            @always-approve="$emit('always-approve')"
          />
        </template>
      </div>

      <div class="bk-agent-panel-input">
        <div class="bk-agent-input">
          <FlexTextarea
            ref="textarea"
            v-model="inputValue"
            :max-height="150"
            submit-on-enter
            paste-html
            rows="1"
            :placeholder="placeholder"
            @submit="onSubmit"
          />
          <div class="bk-agent-input-actions">
            <button
              class="bk-agent-debug-btn"
              title="Log WebSocket messages to console"
              @click="$emit('debug')"
            >
              <Icon name="bk_mdi_bug_report" />
            </button>
            <button
              v-if="isProcessing"
              class="bk-agent-cancel-btn"
              @click="$emit('cancel')"
            >
              <Icon name="bk_mdi_stop" />
            </button>
            <button
              v-else
              class="bk-agent-submit-btn"
              :disabled="!canSubmit"
              @click="onSubmit"
            >
              <Icon name="bk_mdi_arrow_upward" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {
  ref,
  computed,
  useTemplateRef,
  nextTick,
  watch,
  useBlokkli,
} from '#imports'
import { Icon, FlexTextarea } from '#blokkli/editor/components'
import Conversation from './Conversation.vue'
import PendingMutation from './PendingMutation.vue'
import DebugGallery from './DebugGallery.vue'
import type {
  ConversationItem,
  ActiveItem,
  MutationAction,
} from '#blokkli/agent/app/types'
import { mcpTools } from '#blokkli-build/mcp-tools-client'
import { isToolDefinition } from '#blokkli/agent/app/helpers'
import { itemEntityType } from '#blokkli-build/config'

type PendingToolCall = {
  toolName: string
  params: Record<string, unknown>
}

const app = useBlokkli()

// Create context for tool components locally
const toolContext = computed(() => ({
  app,
  itemEntityType,
  adapter: app.adapter,
}))

const staticTools = mcpTools.filter(isToolDefinition)

const pendingToolComponent = computed(() => {
  if (!props.pendingToolCall) return null
  const tool = staticTools.find((t) => t.name === props.pendingToolCall!.toolName)
  return tool?.component || null
})

const props = defineProps<{
  history: ConversationItem[]
  activeItem: ActiveItem | null
  isProcessing: boolean
  isThinking: boolean
  pendingMutation: {
    action: MutationAction
    resolve: (approved: boolean) => void
  } | null
  pendingToolCall: PendingToolCall | null
  autoApprove: boolean
  debugStyling?: boolean
}>()

const emit = defineEmits<{
  (e: 'send-prompt', prompt: string): void
  (e: 'approve'): void
  (e: 'reject'): void
  (e: 'always-approve'): void
  (e: 'cancel'): void
  (e: 'debug'): void
  (e: 'tool-component-done', result: unknown): void
}>()

const { $t } = app

const inputValue = ref('')
const textarea = useTemplateRef('textarea')
const scrollContainer = useTemplateRef('scrollContainer')

// Track if user is at the bottom of the scroll container
const isAtBottom = ref(true)
const SCROLL_THRESHOLD = 50 // pixels from bottom to consider "at bottom"

function onScroll() {
  if (!scrollContainer.value) return
  const { scrollTop, scrollHeight, clientHeight } = scrollContainer.value
  isAtBottom.value = scrollHeight - scrollTop - clientHeight < SCROLL_THRESHOLD
}

function scrollToBottom() {
  if (!scrollContainer.value) return
  scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight
}

// Auto-scroll when history changes, but only if user was at bottom
watch(
  () => props.history,
  () => {
    if (isAtBottom.value) {
      nextTick(scrollToBottom)
    }
  },
)

// Auto-scroll when active item changes
watch(
  () => props.activeItem,
  () => {
    if (isAtBottom.value) {
      nextTick(scrollToBottom)
    }
  },
)

// Also scroll when pending mutation or tool component appears
watch(
  () => props.pendingMutation,
  () => {
    if (isAtBottom.value) {
      nextTick(scrollToBottom)
    }
  },
)

watch(
  () => props.pendingToolCall,
  () => {
    if (isAtBottom.value) {
      nextTick(scrollToBottom)
    }
  },
)

// Focus textarea when processing completes
watch(
  () => props.isProcessing,
  (isProcessing, wasProcessing) => {
    if (wasProcessing && !isProcessing) {
      nextTick(() => textarea.value?.focus())
    }
  },
)

const canSubmit = computed(() => {
  return inputValue.value.trim().length > 0 && !props.isProcessing
})

const placeholder = computed(() => {
  if (props.isProcessing) {
    return $t('aiAgentProcessing', 'Processing...')
  }
  if (props.pendingMutation || props.pendingToolCall) {
    return $t('aiAgentAwaitingApproval', 'Awaiting your approval...')
  }
  return $t('aiAgentPlaceholder', 'Ask me to edit the page content...')
})

function onSubmit() {
  if (!canSubmit.value) return

  emit('send-prompt', inputValue.value)
  inputValue.value = ''
}
</script>
