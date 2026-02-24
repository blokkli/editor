<template>
  <PluginSidebar
    id="agent"
    :title="agentName"
    :tooltip-title
    :tour-text="
      $t('aiAgentTourText', 'Chat with an AI assistant to edit page content.')
    "
    icon="stars"
    weight="-900"
    render-always
    beta
    region="right-bottom"
    @toggle="closeAgentPopup"
  >
    <template #icon>
      <Icon name="stars" class="bk-is-animated" />
    </template>
    <template #default="{ isShown }">
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
        :tool-details
        :usage-turns="usageTurns"
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
        @show-conversations="onShowConversations"
        @hide-conversations="onHideConversations"
        @approve-plan="approvePlan"
        @reject-plan="rejectPlan"
      />
    </template>
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
        <AgentTranscript
          v-if="transcriptContent"
          :transcript="transcriptContent"
        />
      </DialogModal>
    </BlokkliTransition>

    <Popup
      id="agent"
      ref="popup"
      :title="$t('aiAgentPopupTitle', 'AI-Assistant')"
      :cta="$t('aiAgentIntroPopupCta', 'Get started')"
      theme="primary"
      position="bottom-right"
      @submit="openAgent"
    >
      <Icon name="stars" class="bk-is-animated" />
      <p v-html="popupText" />
    </Popup>
  </Teleport>
</template>

<script lang="ts" setup>
import {
  useBlokkli,
  defineBlokkliFeature,
  onBeforeUnmount,
  computed,
  useTemplateRef,
} from '#imports'
import { PluginSidebar } from '#blokkli/editor/plugins'
import {
  DialogModal,
  BlokkliTransition,
  Icon,
  Popup,
} from '#blokkli/editor/components'
import agentProvider from '#blokkli/agent/app/composables/agentProvider'
import { agentPrompts, agentName } from '#blokkli-build/agent-client'
import AgentPanel from './Panel/index.vue'
import AgentTranscript from './Transcript/index.vue'
import { defineItemDropdownAction } from '#blokkli/editor/composables'
import type { ItemDropdownAction } from '#blokkli/editor/providers/plugin'

const DEBUG_STYLING = false

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

const popup = useTemplateRef('popup')

function closeAgentPopup() {
  if (popup.value) {
    popup.value.closePopup()
  }
}

function openAgent() {
  app.eventBus.emit('sidebar:open', 'agent')
}

const popupText = computed(() => {
  return $t(
    'aiAgentIntroPopup',
    'Need help editing? @name is your AI assistant — it can add, move, and update blocks and much more. Give it a try!',
  ).replace('@name', `<em>${agentName}</em>`)
})

const tooltipTitle = computed(() => {
  return $t('agentSidebarTooltipLabel', '@name (AI-Assistant)').replace(
    '@name',
    agentName,
  )
})

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
