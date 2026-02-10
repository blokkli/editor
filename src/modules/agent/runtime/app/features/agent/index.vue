<template>
  <PluginSidebar
    id="agent"
    v-slot="{ isShown }"
    :title="agentName"
    :tour-text="
      $t('aiAgentTourText', 'Chat with an AI assistant to edit page content.')
    "
    icon="stars"
    weight="-900"
    render-always
    beta
  >
    <AgentPanel
      :is-shown
      :debug-styling="DEBUG_STYLING"
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
      :usage-turns="usageTurns"
      @connect="connect"
      @send-prompt="sendPrompt"
      @cancel="cancel"
      @approve="approve"
      @reject="reject"
      @set-auto-approve="setAutoApprove"
      @new-conversation="newConversation"
      @get-transcript="getTranscript"
      @tool-component-done="onToolComponentDone"
      @switch-conversation="switchConversation"
      @delete-conversation="deleteConversation"
      @show-conversations="onShowConversations"
      @hide-conversations="onHideConversations"
      @approve-plan="approvePlan"
      @reject-plan="rejectPlan"
    />
  </PluginSidebar>

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
        <pre class="bk-agent-transcript">{{ transcriptContent }}</pre>
      </DialogModal>
    </BlokkliTransition>
  </Teleport>
</template>

<script lang="ts" setup>
import { useBlokkli, defineBlokkliFeature, onBeforeUnmount } from '#imports'
import { PluginSidebar } from '#blokkli/editor/plugins'
import { DialogModal, BlokkliTransition } from '#blokkli/editor/components'
import agentProvider from '#blokkli/agent/app/composables/agentProvider'
import { agentPrompts } from '#blokkli-build/agent-client'
import AgentPanel from './Panel/index.vue'
import { defineItemDropdownAction } from '#blokkli/editor/composables'
import type { ItemDropdownAction } from '#blokkli/editor/providers/plugin'

const DEBUG_STYLING = false
const agentName = 'Gschwindi'

const { adapter } = defineBlokkliFeature({
  id: 'agent',
  icon: 'stars',
  label: 'AI Agent',
  description: 'Chat with an AI assistant to edit page content.',
  requiredPermissions: ['use_agent'],
  requiredAdapterMethods: [
    'updateFieldValue',
    'addNewBlock',
    'deleteBlocks',
    'moveMultipleBlocks',
  ],
})

const app = useBlokkli()
const { $t, ui } = app

const {
  isConnected,
  hasBeenReady,
  connect,
  disconnect,
  conversation,
  activeItem,
  isProcessing,
  isThinking,
  autoApprove,
  pendingMutation,
  pendingToolCall,
  plan,
  approvePlan,
  rejectPlan,
  usageTurns,
  sendPrompt,
  approve,
  reject,
  setAutoApprove,
  cancel,
  newConversation,
  getTranscript,
  onToolComponentDone,
  transcriptContent,
  showTranscript,
  conversationList,
  showConversationList,
  switchConversation,
  deleteConversation,
  refreshConversationList,
} = agentProvider(app, adapter, agentName)

async function onShowConversations() {
  await refreshConversationList()
  showConversationList.value = true
}

function onHideConversations() {
  showConversationList.value = false
}

onBeforeUnmount(() => {
  disconnect()
})

defineItemDropdownAction(() => {
  return agentPrompts.flatMap((promptFactory) => {
    const promptsResult =
      '__factory' in promptFactory ? promptFactory.resolve(app) : promptFactory
    const prompts = Array.isArray(promptsResult)
      ? promptsResult
      : [promptsResult]
    return prompts.map<ItemDropdownAction>((prompt) => {
      const promptText = prompt.getPrompt(app)
      const userPromptText = prompt.getUserPrompt?.(app)
      return {
        id: 'agent:prompt:' + prompt.id,
        label: prompt.getLabel(app),
        icon: 'stars',
        group: 'agent',
        variant: 'agent',
        weight: -900,
        callback: () => {
          app.eventBus.emit('sidebar:open', 'agent')
          sendPrompt(promptText, userPromptText, [...app.selection.uuids.value])
        },
      }
    })
  })
})
</script>

<script lang="ts">
export default {
  name: 'Agent',
}
</script>
