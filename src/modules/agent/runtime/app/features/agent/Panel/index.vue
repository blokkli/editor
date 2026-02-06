<template>
  <div
    v-if="agent.isConnected.value || debugStyling"
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
          <!-- Welcome text when conversation is empty -->
          <Welcome v-if="showWelcome" :agent-name @prompt="onWelcomePrompt" />

          <!-- Conversation history with active item -->
          <Conversation
            v-if="
              agent.conversation.value.length ||
              agent.activeItem.value ||
              agent.isThinking.value
            "
            :history="agent.conversation.value"
            :active-item="agent.activeItem.value"
            :is-thinking="agent.isThinking.value"
          />

          <!-- Interactive tool component -->
          <component
            :is="pendingToolComponent"
            v-if="pendingToolComponent && agent.pendingToolCall.value"
            :context="toolContext"
            :params="agent.pendingToolCall.value.params"
            @done="agent.onToolComponentDone"
          />

          <!-- Default pending mutation approval -->
          <PendingMutation
            v-else-if="agent.pendingMutation.value && !agent.autoApprove.value"
            :action="agent.pendingMutation.value.action"
            @approve="agent.approve"
            @reject="agent.reject"
            @always-approve="onAlwaysApprove"
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
            rows="2"
            :placeholder="placeholder"
            @submit="onSubmit"
          />
          <div class="bk-agent-input-actions">
            <button
              class="bk-agent-debug-btn"
              title="Log WebSocket messages to console"
              @click="agent.getTranscript"
            >
              <Icon name="bk_mdi_bug_report" />
            </button>
            <button
              v-if="agent.isProcessing.value"
              class="bk-agent-cancel-btn"
              @click="agent.cancel"
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
  <div v-else class="bk-agent-connecting">
    <Icon name="loader" />
    <span>{{ $t('aiAgentConnecting', 'Connecting...') }}</span>
  </div>
</template>

<script lang="ts" setup>
import {
  ref,
  computed,
  useTemplateRef,
  nextTick,
  watch,
  inject,
  useBlokkli,
} from '#imports'
import { Icon, FlexTextarea } from '#blokkli/editor/components'
import Conversation from './Conversation.vue'
import PendingMutation from './PendingMutation.vue'
import DebugGallery from './DebugGallery.vue'
import Welcome from './Welcome/index.vue'
import type { AgentProvider } from '#blokkli/agent/app/composables'
import { mcpTools } from '#blokkli-build/agent-client'
import { isToolDefinition } from '#blokkli/agent/app/helpers'
import { itemEntityType } from '#blokkli-build/config'

const props = defineProps<{
  agentName: string
  isShown: boolean
  debugStyling?: boolean
}>()

const app = useBlokkli()
const { $t } = app

const agent = inject<AgentProvider>('agent')!

// Connect when sidebar first becomes visible (provider guards against duplicate calls)
watch(
  () => props.isShown,
  (isShown) => {
    if (isShown && !props.debugStyling) {
      agent.connect()
    }
  },
  { immediate: true },
)

// Create context for tool components locally
const toolContext = computed(() => ({
  app,
  itemEntityType,
  adapter: app.adapter,
}))

const staticTools = mcpTools.filter(isToolDefinition)

const pendingToolComponent = computed(() => {
  if (!agent.pendingToolCall.value) return null
  const tool = staticTools.find(
    (t) => t.name === agent.pendingToolCall.value!.toolName,
  )
  return tool?.component || null
})

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
  () => agent.conversation.value,
  () => {
    if (isAtBottom.value) {
      nextTick(scrollToBottom)
    }
  },
)

// Auto-scroll when active item changes
watch(
  () => agent.activeItem.value,
  () => {
    if (isAtBottom.value) {
      nextTick(scrollToBottom)
    }
  },
)

// Also scroll when pending mutation or tool component appears
watch(
  () => agent.pendingMutation.value,
  () => {
    if (isAtBottom.value) {
      nextTick(scrollToBottom)
    }
  },
)

watch(
  () => agent.pendingToolCall.value,
  () => {
    if (isAtBottom.value) {
      nextTick(scrollToBottom)
    }
  },
)

// Focus textarea when processing completes
watch(
  () => agent.isProcessing.value,
  (isProcessing, wasProcessing) => {
    if (wasProcessing && !isProcessing) {
      nextTick(() => textarea.value?.focus())
    }
  },
)

const canSubmit = computed(() => {
  return inputValue.value.trim().length > 0 && !agent.isProcessing.value
})

const showWelcome = computed(() => {
  return (
    !agent.conversation.value.length &&
    !agent.activeItem.value &&
    !agent.isThinking.value
  )
})

const placeholder = computed(() => {
  if (agent.isProcessing.value) {
    return $t('aiAgentProcessing', 'Processing...')
  }
  if (agent.pendingMutation.value || agent.pendingToolCall.value) {
    return $t('aiAgentAwaitingApproval', 'Awaiting your approval...')
  }
  return $t('aiAgentPlaceholder', 'Ask me to edit the page content...')
})

function onAlwaysApprove() {
  agent.setAutoApprove(true)
}

function onWelcomePrompt(prompt: string) {
  agent.sendPrompt(prompt)
}

function onSubmit() {
  if (!canSubmit.value) return
  agent.sendPrompt(inputValue.value)
  inputValue.value = ''
}
</script>
