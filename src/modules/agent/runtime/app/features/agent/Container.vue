<template>
  <AgentPanel
    :is-shown
    :agent-name
    :conversation
    :active-item
    :is-thinking
    :is-processing
    :is-connected
    :has-been-ready
    :pending-tool-call
    :pending-mutation
    :auto-approve
    :conversation-list
    :show-conversation-list
    :plan
    :tool-details
    :usage-turns="usageTurns"
    :page-context="pageContext"
    :supports-feedback="!!adapter.submitConversationFeedback"
    :feedback-item-ids="feedbackItemIds"
    @connect="connect"
    @send-prompt="sendPrompt"
    @retry="retry"
    @cancel="cancel"
    @approve="approve"
    @reject="reject"
    @set-auto-approve="setAutoApprove"
    @new-conversation="newConversation"
    @get-transcript="getTranscript"
    @tool-component-done="onToolComponentDone"
    @switch-conversation="switchConversation"
    @delete-conversation="deleteConversation"
    @submit-feedback="onSubmitFeedback"
    @feedback-done="onFeedbackDone"
    @show-conversations="onShowConversations"
    @hide-conversations="onHideConversations"
    @approve-plan="approvePlan"
    @reject-plan="rejectPlan"
  />

  <Teleport :to="ui.mainLayoutElement.value">
    <BlokkliTransition name="slide-up">
      <DialogModal
        v-if="showTranscript"
        id="agent-transcript"
        title="Agent Transcript"
        :width="900"
        hide-buttons
        full-screen
        @cancel="showTranscript = false"
      >
        <AgentTranscript
          v-if="transcriptContent"
          :transcript="transcriptContent"
        />
      </DialogModal>
    </BlokkliTransition>
  </Teleport>
</template>

<script lang="ts" setup>
import {
  useBlokkli,
  onBeforeUnmount,
  watch,
  defineAsyncComponent,
} from '#imports'
import { DialogModal, BlokkliTransition } from '#blokkli/editor/components'
import agentProvider from '#blokkli/agent/app/composables/agentProvider'
import AgentPanel from './Panel/index.vue'
import type {
  AgentConversationFeedbackRating,
  PendingPromptRequest,
} from './types'
import type { FullBlokkliAdapter } from '#blokkli/editor/adapter'

const AgentTranscript = defineAsyncComponent(
  () => import('./Transcript/index.vue'),
)

const props = defineProps<{
  isShown: boolean
  agentName: string
  adapter: FullBlokkliAdapter<any>
  pendingPromptRequest: PendingPromptRequest | null
}>()

const emit = defineEmits<{
  (e: 'consumed'): void
}>()

const app = useBlokkli()
const { ui } = app

const {
  connect,
  disconnect,
  conversation,
  activeItem,
  isProcessing,
  isThinking,
  isConnected,
  hasBeenReady,
  autoApprove,
  pendingMutation,
  pendingToolCall,
  plan,
  approvePlan,
  rejectPlan,
  usageTurns,
  sendPrompt,
  runToolForPrompt,
  retry,
  approve,
  reject,
  setAutoApprove,
  cancel,
  newConversation,
  getTranscript,
  onToolComponentDone,
  transcriptContent,
  showTranscript,
  toolDetails,
  conversationList,
  showConversationList,
  switchConversation,
  deleteConversation,
  refreshConversationList,
  activeConversationId,
  feedbackItemIds,
  pageContext,
} = agentProvider(app, props.adapter, props.agentName)

async function onSubmitFeedback(
  rating: AgentConversationFeedbackRating,
  comment?: string,
) {
  if (!props.adapter.submitConversationFeedback) return
  const conversationId = activeConversationId.value
  if (!conversationId) return
  const lastItem = conversation.value[conversation.value.length - 1]
  if (!lastItem) return

  try {
    await props.adapter.submitConversationFeedback({
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
    feedbackItemIds.value.add(lastItem.id)
  }
}

async function onShowConversations() {
  await refreshConversationList()
  showConversationList.value = true
}

function onHideConversations() {
  showConversationList.value = false
}

// Process a prompt request queued by the outer feature component's
// item-dropdown callback. `immediate: true` picks up a request that was set
// before this container mounted (the common case: user clicks a dropdown
// action which triggers the sidebar to open for the first time).
watch(
  () => props.pendingPromptRequest,
  async (request) => {
    if (!request) return
    emit('consumed')

    const { prompt, selectedUuids } = request
    const promptText = prompt.getPrompt(app)
    const userPromptText = prompt.getUserPrompt?.(app)

    let preSeededResults = undefined
    let autoExecuteTools = undefined

    if (prompt.preExecute) {
      const preResult = await prompt.preExecute({
        app,
        selectedUuids,
        runTool: runToolForPrompt,
      })
      if (preResult) {
        preSeededResults = preResult.preSeededResults
        autoExecuteTools = preResult.autoExecuteTools
      }
    }

    sendPrompt(
      promptText,
      userPromptText,
      selectedUuids,
      undefined,
      prompt.tools,
      prompt.skills,
      preSeededResults,
      autoExecuteTools,
    )
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  disconnect()
})
</script>

<script lang="ts">
export default {
  name: 'AgentContainer',
}
</script>
