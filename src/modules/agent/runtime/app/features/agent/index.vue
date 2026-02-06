<template>
  <PluginSidebar
    id="agent"
    :title="$t('aiAgent', 'AI Agent')"
    :tour-text="
      $t('aiAgentTourText', 'Chat with an AI assistant to edit page content.')
    "
    icon="stars"
    weight="-10"
    render-always
  >
    <template #default="{ isShown }">
      <AgentPanel :is-shown :debug-styling="DEBUG_STYLING" />
    </template>

    <template
      v-if="agent.pendingMutation.value || agent.pendingToolCall.value"
      #badge
    >
      <div class="bk-sidebar-badge bk-is-yellow">1</div>
    </template>
  </PluginSidebar>

  <Teleport :to="ui.mainLayoutElement.value">
    <BlokkliTransition name="slide-up">
      <DialogModal
        v-if="agent.showTranscript.value"
        id="agent-transcript"
        title="Agent Transcript"
        :width="900"
        hide-buttons
        full-screen
        @cancel="agent.showTranscript.value = false"
      >
        <pre class="bk-agent-transcript">{{
          agent.transcriptContent.value
        }}</pre>
      </DialogModal>
    </BlokkliTransition>
  </Teleport>
</template>

<script lang="ts" setup>
import {
  useBlokkli,
  defineBlokkliFeature,
  onBeforeUnmount,
  provide,
} from '#imports'
import { PluginSidebar } from '#blokkli/editor/plugins'
import { DialogModal, BlokkliTransition } from '#blokkli/editor/components'
import { useAgentProvider } from '#blokkli/agent/app/composables'
import AgentPanel from './Panel/index.vue'
import { itemEntityType } from '#blokkli-build/config'

const DEBUG_STYLING = false

const { adapter } = defineBlokkliFeature({
  id: 'agent',
  icon: 'stars',
  label: 'AI Agent',
  description: 'Chat with an AI assistant to edit page content.',
  requiredAdapterMethods: [
    'updateFieldValue',
    'addNewBlock',
    'deleteBlocks',
    'moveMultipleBlocks',
  ],
})

const app = useBlokkli()
const { $t, ui } = app

const agent = useAgentProvider({ app, adapter, itemEntityType })

// Provide agent to children (Panel and interactive tool components)
provide('agent', agent)

onBeforeUnmount(() => {
  agent.disconnect()
})
</script>

<script lang="ts">
export default {
  name: 'Agent',
}
</script>
