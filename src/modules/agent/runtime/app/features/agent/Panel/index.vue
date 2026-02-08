<template>
  <div
    v-if="isConnected || debugStyling"
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
        <DebugGallery v-if="debugStyling" />
        <template v-else>
          <Welcome v-if="showWelcome" :agent-name @prompt="onWelcomePrompt" />
          <Conversation
            v-if="conversation.length || activeItem || isThinking"
            :history="conversation"
            :active-item="activeItem"
            :is-thinking="isThinking"
          />
          <component
            :is="pendingToolComponent"
            v-if="pendingToolComponent && pendingToolCall"
            :context="toolContext"
            :params="pendingToolCall.params"
            @done="(result: unknown) => emit('toolComponentDone', result)"
          />
          <PendingMutation
            v-else-if="pendingMutation && !autoApprove"
            :action="pendingMutation.action"
            @approve="emit('approve')"
            @reject="emit('reject')"
            @always-approve="onAlwaysApprove"
          />
        </template>
      </div>

      <AgentInput
        ref="inputEl"
        v-model="inputValue"
        :placeholder="placeholder"
        :is-processing="isProcessing"
        @submit="onSubmit"
        @cancel="emit('cancel')"
        @new-conversation="onNewConversation"
        @show-transcript="emit('getTranscript')"
        @show-conversations="emit('showConversations')"
      />
    </div>
    <Transition name="bk-agent-overlay" :duration="500">
      <div
        v-if="showConversationList"
        class="bk-agent-conversation-list-overlay"
      >
        <div
          class="bk-agent-conversation-list-backdrop"
          @click="emit('hideConversations')"
        />
        <div class="bk-agent-conversation-list-sheet bk-scrollbar-light">
          <ConversationList
            :conversations="conversationList"
            @switch="(id: string) => emit('switchConversation', id)"
            @delete="(id: string) => emit('deleteConversation', id)"
            @close="emit('hideConversations')"
          />
        </div>
      </div>
    </Transition>
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
  useBlokkli,
} from '#imports'
import { Icon } from '#blokkli/editor/components'
import Conversation from './Conversation/index.vue'
import PendingMutation from './PendingMutation/index.vue'
import DebugGallery from './DebugGallery/index.vue'
import Welcome from './Welcome/index.vue'
import AgentInput from './Input/index.vue'
import ConversationList from './ConversationList/index.vue'
import type {
  AgentConversationSummary,
  PendingMutationState,
  PendingToolCall,
} from '#blokkli/agent/app/composables'
import type { ConversationItem, ActiveItem } from '#blokkli/agent/app/types'
import { mcpTools } from '#blokkli-build/agent-client'
import { isToolDefinition } from '#blokkli/agent/app/helpers'
import { itemEntityType } from '#blokkli-build/config'

const props = defineProps<{
  agentName: string
  isShown: boolean
  debugStyling?: boolean
  conversation: ConversationItem[]
  activeItem: ActiveItem | null
  isThinking: boolean
  isProcessing: boolean
  isConnected: boolean
  pendingToolCall: PendingToolCall | null
  pendingMutation: PendingMutationState | null
  autoApprove: boolean
  conversationList: AgentConversationSummary[]
  showConversationList: boolean
}>()

const emit = defineEmits<{
  connect: []
  sendPrompt: [prompt: string]
  cancel: []
  approve: []
  reject: []
  setAutoApprove: [value: boolean]
  newConversation: []
  getTranscript: []
  toolComponentDone: [result: unknown]
  switchConversation: [id: string]
  deleteConversation: [id: string]
  showConversations: []
  hideConversations: []
}>()

const app = useBlokkli()
const { $t } = app

// Connect when sidebar first becomes visible (provider guards against duplicate calls)
watch(
  () => props.isShown,
  (isShown) => {
    if (isShown && !props.debugStyling) {
      emit('connect')
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
  if (!props.pendingToolCall) return null
  const tool = staticTools.find(
    (t) => t.name === props.pendingToolCall!.toolName,
  )
  return tool?.component || null
})

const inputValue = ref('')
const inputEl = useTemplateRef('inputEl')
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

// Auto-scroll when history changes. Always scroll for user messages (the user
// just submitted something), otherwise only if user was already at the bottom.
watch(
  () => props.conversation,
  (conv) => {
    const last = conv[conv.length - 1]
    if (last?.type === 'user') {
      isAtBottom.value = true
      nextTick(scrollToBottom)
    } else if (isAtBottom.value) {
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
      nextTick(() => inputEl.value?.focus())
    }
  },
)

const showWelcome = computed(() => {
  return !props.conversation.length && !props.activeItem && !props.isThinking
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

function onAlwaysApprove() {
  emit('setAutoApprove', true)
}

function scrollToBottomOnSend() {
  isAtBottom.value = true
  nextTick(scrollToBottom)
}

function onWelcomePrompt(prompt: string) {
  emit('sendPrompt', prompt)
  scrollToBottomOnSend()
}

function onSubmit() {
  if (!inputValue.value.trim() || props.isProcessing) return
  emit('sendPrompt', inputValue.value)
  inputValue.value = ''
  scrollToBottomOnSend()
}

function onNewConversation() {
  emit('newConversation')
}
</script>
