<template>
  <div
    v-if="hasBeenReady || debugStyling"
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
      <div ref="conversationContainer" class="bk-agent-panel-conversation">
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

      <div class="bk-agent-panel-input">
        <TransitionHeight
          :duration="600"
          opacity
          easing-enter="cubic-bezier(0.56, 0.04, 0.25, 1)"
          easing-leave="cubic-bezier(0.56, 0.04, 0.25, 1)"
        >
          <Plan
            v-if="activePlan"
            :plan="activePlan"
            :pending-approval="isPlanPendingApproval"
            @approve="emit('approvePlan')"
            @reject="emit('rejectPlan')"
          />
        </TransitionHeight>
        <AgentInput
          ref="inputEl"
          v-model="inputValue"
          :placeholder="placeholder"
          :is-processing="isProcessing"
          :is-connected="isConnected"
          @submit="onSubmit"
          @cancel="emit('cancel')"
          @new-conversation="onNewConversation"
          @show-transcript="emit('getTranscript')"
          @show-conversations="emit('showConversations')"
        />
      </div>
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
  <div v-else-if="!hasBeenReady" class="bk-agent-connecting">
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
  onBeforeUnmount,
  useBlokkli,
} from '#imports'
import { Icon, TransitionHeight } from '#blokkli/editor/components'
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
import type {
  ConversationItem,
  ActiveItem,
  Attachment,
} from '#blokkli/agent/app/types'
import type { ClientPlanState } from '#blokkli/agent/shared/types'
import Plan from './Plan/index.vue'
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
  hasBeenReady: boolean
  pendingToolCall: PendingToolCall | null
  pendingMutation: PendingMutationState | null
  autoApprove: boolean
  conversationList: AgentConversationSummary[]
  showConversationList: boolean
  plan: ClientPlanState | null
}>()

const emit = defineEmits<{
  connect: []
  sendPrompt: [
    prompt: string,
    displayPrompt?: string,
    selectedUuids?: string[],
    attachments?: Attachment[],
  ]
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
  approvePlan: []
  rejectPlan: []
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

// Auto-scroll using ResizeObserver on the conversation container.
// Any content change (new messages, streaming text, thinking indicator, tool
// results) causes the container to grow, which the observer catches.
const conversationContainer = useTemplateRef('conversationContainer')
let resizeObserver: ResizeObserver | null = null

watch(
  conversationContainer,
  (el, _oldEl, onCleanup) => {
    if (!el) return
    resizeObserver = new ResizeObserver(() => {
      if (isAtBottom.value) {
        scrollToBottom()
      }
    })
    resizeObserver.observe(el)
    onCleanup(() => {
      resizeObserver?.disconnect()
      resizeObserver = null
    })
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
})

// Focus textarea when processing completes
watch(
  () => props.isProcessing,
  (isProcessing, wasProcessing) => {
    if (wasProcessing && !isProcessing) {
      nextTick(() => inputEl.value?.focus())
    }
  },
)

const debugPlan: ClientPlanState = {
  title: 'Restructure page content',
  steps: [
    { label: 'Analyze current page structure', status: 'completed' },
    { label: 'Add hero section with title', status: 'completed' },
    { label: 'Rewrite introduction text', status: 'in_progress' },
    { label: 'Add feature cards grid', status: 'pending' },
    { label: 'Add footer with contact info', status: 'pending' },
  ],
}

const activePlan = computed(() => {
  return props.debugStyling ? debugPlan : props.plan
})

const isPlanPendingApproval = computed(() => {
  return (
    props.debugStyling ||
    (activePlan.value !== null &&
      activePlan.value.steps.every((s) => s.status === 'pending'))
  )
})

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
  if (props.conversation.length) {
    return $t('aiAgentPlaceholderReply', 'Reply...')
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

function onSubmit(submitAttachments: Attachment[]) {
  const text = inputValue.value.trim()
  if ((!text && !submitAttachments.length) || props.isProcessing || !props.isConnected)
    return

  if (!submitAttachments.length) {
    emit('sendPrompt', inputValue.value)
  } else {
    const attachmentBlocks = submitAttachments
      .map((att) => `<attachment type="${att.type}">\n${att.content}\n</attachment>`)
      .join('\n\n')

    const prompt = text
      ? `${text}\n\n${attachmentBlocks}`
      : attachmentBlocks

    emit('sendPrompt', prompt, text, undefined, submitAttachments)
  }

  inputValue.value = ''
  scrollToBottomOnSend()
}

function onNewConversation() {
  emit('newConversation')
}
</script>
