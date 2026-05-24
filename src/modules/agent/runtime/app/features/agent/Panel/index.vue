<template>
  <DropHandler
    v-if="hasBeenReady || DEBUG_STYLING"
    class="bk flex flex-col h-full min-h-[200px] select-text relative bk-agent-panel"
    @mousedown.capture.stop
    @pointerdown.capture.stop
    @pointerup.capture.stop
    @mouseup.capture.stop
    @contextmenu.capture.stop
    @drop="onFileDrop"
  >
    <div
      ref="scrollContainer"
      class="bk-agent-panel-inner bk-scrollbar-light flex-1 overflow-y-scroll flex flex-col"
      :class="{ 'bk-is-pending-approval': isPlanPendingApproval }"
      @scroll="onScroll"
    >
      <div ref="conversationContainer" class="p-10 flex-1 relative">
        <button
          v-if="DEBUG_STYLING"
          class="bk-button bk-scheme-mono bk-is-light"
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
            @retry="agent.retry"
          />
          <component
            :is="pendingToolComponent"
            v-if="pendingToolComponent && pendingToolCall"
            :context="toolContext"
            :params="pendingToolCall.params"
            @done="agent.tools.onComponentDone"
          />
          <PendingMutation
            v-else-if="pendingMutation && !autoApprove"
            :action="pendingMutation.action"
            @approve="agent.tools.approve"
            @reject="agent.tools.reject"
            @always-approve="onAlwaysApprove"
          />
          <TransitionHeight opacity :duration="300">
            <Feedback
              v-if="
                supportsFeedback &&
                !isProcessing &&
                !pendingMutation &&
                !pendingToolCall &&
                conversation.length > 0 &&
                conversation[conversation.length - 1]?.type === 'assistant' &&
                !feedbackItemIds.has(conversation[conversation.length - 1]!.id)
              "
              @submit="onSubmitFeedback"
              @done="onFeedbackDone"
            />
          </TransitionHeight>
        </template>
      </div>

      <SidebarFloater>
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
          @cancel="agent.cancel"
          @new-conversation="onNewConversation"
          @show-transcript="agent.getTranscript"
          @show-conversations="onShowConversations"
        >
          <TransitionHeight opacity :duration="300">
            <div
              v-if="!isConnected && hasBeenReady && !DEBUG_STYLING"
              class="border-b border-b-mono-300 border-dashed flex items-center gap-8 px-10 py-10 text-mono-500 text-sm bg-red-light font-medium text-red-normal"
            >
              <Icon name="loader" class="size-18" />
              <span>{{
                $t('aiAgentDisconnected', 'Connection lost. Reconnecting', {
                  more: true,
                })
              }}</span>
            </div>
          </TransitionHeight>
          <TransitionHeight :duration="600" opacity>
            <Plan
              v-if="activePlan"
              :plan="activePlan"
              :pending-approval="isPlanPendingApproval"
              @approve="agent.plan.approve"
              @reject="agent.plan.reject"
            />
          </TransitionHeight>
        </AgentInput>
      </SidebarFloater>
    </div>
    <BlokkliTransition name="panel-sheet">
      <PanelSheet
        v-if="showConversationList"
        :title="$t('aiAgentPastConversations', 'Past conversations')"
        @close="onHideConversations"
      >
        <ConversationList
          :conversations="conversationList"
          @switch="agent.switchConversation"
          @delete="agent.deleteConversation"
          @close="onHideConversations"
        />
      </PanelSheet>
    </BlokkliTransition>
  </DropHandler>
  <div
    v-else-if="!hasBeenReady"
    class="flex items-center justify-center gap-8 p-20 text-mono-500"
  >
    <Icon name="loader" />
    <span>{{ $t('aiAgentConnecting', 'Connecting', { more: true }) }}</span>
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
import {
  Icon,
  TransitionHeight,
  BlokkliTransition,
} from '#blokkli/editor/components'
import Conversation from '#blokkli/agent/app/components/Conversation/index.vue'
import PendingMutation from './PendingMutation/index.vue'
import DebugGallery from './DebugGallery/index.vue'
import Welcome from './Welcome/index.vue'
import AgentInput from './Input/index.vue'
import ConversationList from './ConversationList/index.vue'
import Feedback from './Feedback/index.vue'
import type { AgentConversationFeedbackRating } from '../types'
import type { Attachment } from '#blokkli/agent/app/types'
import type { ClientPlanState } from '#blokkli/agent/shared/types'
import Plan from './Plan/index.vue'
import DropHandler from './DropHandler/index.vue'
import { mcpTools } from '#blokkli-build/agent-client'
import { itemEntityType } from '#blokkli-build/config'
import { agentName } from '#blokkli-build/agent-prompts'
import PanelSheet from '#blokkli/editor/components/Panel/Sheet/index.vue'
import SidebarFloater from '#blokkli/editor/components/SidebarFloater/index.vue'
import { useAgent } from '#blokkli/agent/app/composables/useAgent'

const props = defineProps<{
  isShown: boolean
}>()

const DEBUG_STYLING = import.meta.dev && false

const app = useBlokkli()
const { $t } = app

const agent = useAgent()
const { isThinking, isProcessing, hasBeenReady } = agent
const { isConnected } = agent.socket
const {
  items: conversation,
  activeItem,
  conversationList,
  showConversationList,
  usageTurns,
  feedbackItemIds,
  toolDetails,
} = agent.conversation
const { pendingToolCall, pendingMutation, autoApprove, pageContext } =
  agent.tools
const { plan } = agent.plan

const supportsFeedback = computed(
  () => !!app.adapter.agentConversations?.submitFeedback,
)

// Connect when sidebar first becomes visible (provider guards against duplicate calls)
watch(
  () => props.isShown,
  (isShown) => {
    if (isShown && !DEBUG_STYLING) {
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
  pageContext: pageContext.value,
}))

const pendingToolComponent = computed(() => {
  if (!pendingToolCall.value) return null
  const tool = mcpTools.find((t) => t.name === pendingToolCall.value!.toolName)
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
watch(isProcessing, (isProcessing, wasProcessing) => {
  if (wasProcessing && !isProcessing) {
    nextTick(() => inputEl.value?.focus())
  }
})

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
  return isProcessing.value
})

const activePlan = computed(() => {
  return DEBUG_STYLING ? (debugShowPlan.value ? debugPlan : null) : plan.value
})

const isPlanPendingApproval = computed(() => {
  return (
    activePlan.value !== null &&
    activePlan.value.steps.every((s) => s.status === 'pending')
  )
})

const showWelcome = computed(() => {
  return !conversation.value.length && !activeItem.value && !isThinking.value
})

function onAlwaysApprove() {
  agent.tools.setAutoApprove(true)
}

function scrollToBottomOnSend() {
  isAtBottom.value = true
  nextTick(scrollToBottom)
}

function onWelcomePrompt(prompt: string) {
  agent.sendPrompt({ prompt })
  scrollToBottomOnSend()
}

function onSubmit(submitAttachments: Attachment[]) {
  const text = inputValue.value.trim()
  if (
    (!text && !submitAttachments.length) ||
    isProcessing.value ||
    !isConnected.value
  )
    return

  if (!submitAttachments.length) {
    agent.sendPrompt({ prompt: inputValue.value })
  } else {
    const attachmentBlocks = submitAttachments
      .map(
        (att) =>
          `<attachment type="${att.type}">\n${att.content}\n</attachment>`,
      )
      .join('\n\n')

    const prompt = text ? `${text}\n\n${attachmentBlocks}` : attachmentBlocks

    agent.sendPrompt({
      prompt,
      displayPrompt: text,
      attachments: submitAttachments,
    })
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
  agent.newConversation()
}

async function onSubmitFeedback(
  rating: AgentConversationFeedbackRating,
  comment?: string,
) {
  if (!app.adapter.agentConversations?.submitFeedback) return
  const conversationId = agent.conversation.activeConversationId.value
  if (!conversationId) return
  const lastItem = conversation.value[conversation.value.length - 1]
  if (!lastItem) return

  try {
    await app.adapter.agentConversations.submitFeedback({
      conversationId,
      rating,
      lastItemId: lastItem.id,
      comment,
    })
  } catch (e) {
    console.warn('[blokkli agent] Failed to submit feedback:', e)
  }
}

function onFeedbackDone() {
  const lastItem = conversation.value[conversation.value.length - 1]
  if (lastItem) {
    agent.conversation.feedbackItemIds.value.add(lastItem.id)
  }
}

async function onShowConversations() {
  await agent.refreshConversationList()
  agent.conversation.showConversationList.value = true
}

function onHideConversations() {
  agent.conversation.showConversationList.value = false
}
</script>
