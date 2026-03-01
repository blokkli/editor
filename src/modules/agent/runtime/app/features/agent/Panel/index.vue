<template>
  <DropHandler
    v-if="hasBeenReady || DEBUG_STYLING"
    class="bk bk-agent-panel"
    @mousedown.capture.stop
    @pointerdown.capture.stop
    @pointerup.capture.stop
    @mouseup.capture.stop
    @contextmenu.capture.stop
    @drop="onFileDrop"
  >
    <div
      ref="scrollContainer"
      class="bk-agent-panel-inner bk-scrollbar-light"
      :class="{ 'bk-is-pending-approval': isPlanPendingApproval }"
      @scroll="onScroll"
    >
      <div ref="conversationContainer" class="bk-agent-panel-conversation">
        <button
          v-if="DEBUG_STYLING"
          class="bk-button"
          @click="debugShowPlan = !debugShowPlan"
        >
          {{ debugShowPlan ? 'Hide' : 'Show' }} Plan
        </button>
        <DebugGallery v-if="DEBUG_STYLING" />
        <template v-else>
          <Welcome v-if="showWelcome" :agent-name @prompt="onWelcomePrompt" />
          <Conversation
            v-if="conversation.length || activeItem || isThinking"
            :history="conversation"
            :active-item="activeItem"
            :is-thinking="isThinking"
            :tool-details
            @retry="emit('retry')"
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
        <AgentInput
          ref="inputEl"
          v-model="inputValue"
          v-model:attachments="attachments"
          :is-processing="debugIsProcessing"
          :is-connected
          :has-pending-approval="!!(pendingMutation || pendingToolCall)"
          :has-conversation="conversation.length > 0"
          :usage-turns
          :has-active-plan="!!activePlan"
          @submit="onSubmit"
          @cancel="emit('cancel')"
          @new-conversation="onNewConversation"
          @show-transcript="emit('getTranscript')"
          @show-conversations="emit('showConversations')"
        >
          <TransitionHeight opacity :duration="300">
            <div
              v-if="!isConnected && hasBeenReady && !DEBUG_STYLING"
              class="bk-agent-disconnected"
            >
              <Icon name="loader" />
              <span>{{
                $t('aiAgentDisconnected', 'Connection lost. Reconnecting...')
              }}</span>
            </div>
          </TransitionHeight>
          <TransitionHeight :duration="600" opacity>
            <Plan
              v-if="activePlan"
              :plan="activePlan"
              :pending-approval="isPlanPendingApproval"
              @approve="emit('approvePlan')"
              @reject="emit('rejectPlan')"
            />
          </TransitionHeight>
        </AgentInput>
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
  </DropHandler>
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
import type {
  ClientPlanState,
  PageContext,
  UsageTurn,
} from '#blokkli/agent/shared/types'
import Plan from './Plan/index.vue'
import DropHandler from './DropHandler/index.vue'
import { mcpTools } from '#blokkli-build/agent-client'
import { itemEntityType } from '#blokkli-build/config'

const props = defineProps<{
  agentName: string
  isShown: boolean
  conversation: ConversationItem[]
  activeItem: ActiveItem | null
  isThinking: boolean
  isProcessing: boolean
  isConnected: boolean
  hasBeenReady: boolean
  pendingToolCall: PendingToolCall | null
  pendingMutation: PendingMutationState | null
  autoApprove: boolean
  toolDetails: Map<string, unknown>
  conversationList: AgentConversationSummary[]
  showConversationList: boolean
  plan: ClientPlanState | null
  usageTurns: UsageTurn[]
  pageContext: PageContext | null
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
  retry: []
  approvePlan: []
  rejectPlan: []
}>()

const DEBUG_STYLING = import.meta.dev && false

const app = useBlokkli()
const { $t } = app

// Connect when sidebar first becomes visible (provider guards against duplicate calls)
watch(
  () => props.isShown,
  (isShown) => {
    if (isShown && !DEBUG_STYLING) {
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
  pageContext: props.pageContext,
}))

const pendingToolComponent = computed(() => {
  if (!props.pendingToolCall) return null
  const tool = mcpTools.find((t) => t.name === props.pendingToolCall!.toolName)
  return tool?.component || null
})

const inputValue = ref('')
const attachments = ref<Attachment[]>([])
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

const debugShowPlan = ref(true)

const debugIsProcessing = computed(() => {
  if (DEBUG_STYLING) {
    return debugShowPlan.value
  }
  return props.isProcessing
})

const activePlan = computed(() => {
  return DEBUG_STYLING ? (debugShowPlan.value ? debugPlan : null) : props.plan
})

const isPlanPendingApproval = computed(() => {
  return (
    activePlan.value !== null &&
    activePlan.value.steps.every((s) => s.status === 'pending')
  )
})

const showWelcome = computed(() => {
  return !props.conversation.length && !props.activeItem && !props.isThinking
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
  if (
    (!text && !submitAttachments.length) ||
    props.isProcessing ||
    !props.isConnected
  )
    return

  if (!submitAttachments.length) {
    emit('sendPrompt', inputValue.value)
  } else {
    const attachmentBlocks = submitAttachments
      .map(
        (att) =>
          `<attachment type="${att.type}">\n${att.content}\n</attachment>`,
      )
      .join('\n\n')

    const prompt = text ? `${text}\n\n${attachmentBlocks}` : attachmentBlocks

    emit('sendPrompt', prompt, text, undefined, submitAttachments)
  }

  inputValue.value = ''
  attachments.value = []
  scrollToBottomOnSend()
}

function onFileDrop(dropped: Attachment[]) {
  attachments.value.push(...dropped)
  nextTick(() => inputEl.value?.focus())
}

function onNewConversation() {
  emit('newConversation')
}
</script>
