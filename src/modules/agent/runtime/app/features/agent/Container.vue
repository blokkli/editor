<template>
  <AgentPanel
    :is-shown
    :agent-name
    :conversation="conversation.items.value"
    :active-item="conversation.activeItem.value"
    :is-thinking="agent.isThinking.value"
    :is-processing="agent.isProcessing.value"
    :is-connected="socket.isConnected.value"
    :has-been-ready="agent.hasBeenReady.value"
    :pending-tool-call="tools.pendingToolCall.value"
    :pending-mutation="tools.pendingMutation.value"
    :auto-approve="tools.autoApprove.value"
    :conversation-list="conversation.conversationList.value"
    :show-conversation-list="conversation.showConversationList.value"
    :plan="plan.plan.value"
    :tool-details="conversation.toolDetails"
    :usage-turns="conversation.usageTurns.value"
    :page-context="tools.pageContext.value"
    :supports-feedback="!!adapter.agentConversations?.submitFeedback"
    :feedback-item-ids="conversation.feedbackItemIds.value"
    @connect="agent.connect"
    @send-prompt="agent.sendPrompt"
    @retry="agent.retry"
    @cancel="agent.cancel"
    @approve="tools.approve"
    @reject="tools.reject"
    @set-auto-approve="tools.setAutoApprove"
    @new-conversation="agent.newConversation"
    @get-transcript="agent.getTranscript"
    @tool-component-done="tools.onComponentDone"
    @switch-conversation="agent.switchConversation"
    @delete-conversation="agent.deleteConversation"
    @submit-feedback="onSubmitFeedback"
    @feedback-done="onFeedbackDone"
    @show-conversations="onShowConversations"
    @hide-conversations="onHideConversations"
    @approve-plan="plan.approve"
    @reject-plan="plan.reject"
  />

  <Teleport :to="ui.mainLayoutElement.value">
    <BlokkliTransition name="slide-up">
      <DialogModal
        v-if="conversation.showTranscript.value"
        id="agent-transcript"
        title="Agent Transcript"
        :width="900"
        hide-buttons
        full-screen
        @cancel="conversation.showTranscript.value = false"
      >
        <AgentTranscript
          v-if="conversation.transcriptContent.value"
          :transcript="conversation.transcriptContent.value"
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
  provide,
  defineAsyncComponent,
} from '#imports'
import { DialogModal, BlokkliTransition } from '#blokkli/editor/components'
import socketProvider from '#blokkli/agent/app/providers/socketProvider'
import conversationProvider from '#blokkli/agent/app/providers/conversationProvider'
import planProvider from '#blokkli/agent/app/providers/planProvider'
import toolsProvider from '#blokkli/agent/app/providers/toolsProvider'
import agentProvider from '#blokkli/agent/app/providers/agentProvider'
import { INJECT_AGENT_APP } from '#blokkli/agent/app/helpers/injections'
import type { AgentApp } from '#blokkli/agent/app/types'
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

const blokkli = useBlokkli()
const { ui } = blokkli

const socket = socketProvider()
const conversation = conversationProvider({ adapter: props.adapter })
const plan = planProvider({ socket, conversation })
const tools = toolsProvider({
  app: blokkli,
  adapter: props.adapter,
  socket,
  conversation,
})
const agent = agentProvider({
  app: blokkli,
  adapter: props.adapter,
  agentName: props.agentName,
  socket,
  conversation,
  plan,
  tools,
})

const adapter = props.adapter

const agentApp: AgentApp = {
  socket,
  conversation,
  plan,
  tools,
  ...agent,
}
provide(INJECT_AGENT_APP, agentApp)

async function onSubmitFeedback(
  rating: AgentConversationFeedbackRating,
  comment?: string,
) {
  if (!adapter.agentConversations?.submitFeedback) return
  const conversationId = conversation.activeConversationId.value
  if (!conversationId) return
  const lastItem = conversation.items.value[conversation.items.value.length - 1]
  if (!lastItem) return

  try {
    await adapter.agentConversations.submitFeedback({
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
  const lastItem = conversation.items.value[conversation.items.value.length - 1]
  if (lastItem) {
    conversation.feedbackItemIds.value.add(lastItem.id)
  }
}

async function onShowConversations() {
  await agent.refreshConversationList()
  conversation.showConversationList.value = true
}

function onHideConversations() {
  conversation.showConversationList.value = false
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
    const promptText = prompt.getPrompt(blokkli)
    const userPromptText = prompt.getUserPrompt?.(blokkli)

    let preSeededResults = undefined
    let autoExecuteTools = undefined

    if (prompt.preExecute) {
      const preResult = await prompt.preExecute({
        app: blokkli,
        selectedUuids,
        runTool: tools.runForPrompt,
      })
      if (preResult) {
        preSeededResults = preResult.preSeededResults
        autoExecuteTools = preResult.autoExecuteTools
      }
    }

    agent.sendPrompt(
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
  agent.disconnect()
})
</script>

<script lang="ts">
export default {
  name: 'AgentContainer',
}
</script>
