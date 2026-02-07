<template>
  <PluginSidebar
    id="agent"
    :title="agentName"
    :tour-text="
      $t('aiAgentTourText', 'Chat with an AI assistant to edit page content.')
    "
    icon="stars"
    weight="-900"
    render-always
    beta
  >
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
        :pending-tool-call
        :pending-mutation
        :auto-approve
        @connect="connect"
        @send-prompt="sendPrompt"
        @cancel="cancel"
        @approve="approve"
        @reject="reject"
        @set-auto-approve="setAutoApprove"
        @new-conversation="newConversation"
        @get-transcript="getTranscript"
        @tool-component-done="onToolComponentDone"
      />
    </template>

    <template v-if="pendingMutation || pendingToolCall" #badge>
      <div class="bk-sidebar-badge bk-is-yellow">1</div>
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
        <pre class="bk-agent-transcript">{{ transcriptContent }}</pre>
      </DialogModal>
    </BlokkliTransition>
  </Teleport>
</template>

<script lang="ts" setup>
import { useBlokkli, defineBlokkliFeature, onBeforeUnmount } from '#imports'
import { PluginSidebar } from '#blokkli/editor/plugins'
import { DialogModal, BlokkliTransition } from '#blokkli/editor/components'
import { useAgentProvider } from '#blokkli/agent/app/composables'
import { agentPrompts } from '#blokkli-build/agent-client'
import AgentPanel from './Panel/index.vue'
import { itemEntityType } from '#blokkli-build/config'
import { defineItemDropdownAction } from '#blokkli/editor/composables'
import type { ItemDropdownAction } from '#blokkli/editor/providers/plugin'

const DEBUG_STYLING = false
const agentName = 'Agäntli'

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
  connect,
  disconnect,
  conversation,
  activeItem,
  isProcessing,
  isThinking,
  autoApprove,
  pendingMutation,
  pendingToolCall,
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
} = useAgentProvider({ app, adapter, itemEntityType })

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
